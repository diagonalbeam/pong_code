package cmd

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/liuxuejin008/pong_code/apps/cli/internal/api"
	"github.com/spf13/cobra"
)

func addContextCommands(root *cobra.Command) {
	context := &cobra.Command{Use: "context", Short: "管理默认项目和迭代上下文"}
	useCmd := &cobra.Command{
		Use:   "use",
		Short: "设置默认项目和迭代",
		Long:  "不带 --project-id 时，交互式选择组织、项目和迭代；选择结果会显示对应 ID 并保存到本地上下文。",
		RunE: func(cmd *cobra.Command, args []string) error {
			runtime, err := newRuntime(cmd, true)
			if err != nil {
				return err
			}
			projectID, err := cmd.Flags().GetInt64("project-id")
			if err != nil {
				return err
			}
			sprintID, err := cmd.Flags().GetInt64("sprint-id")
			if err != nil {
				return err
			}
			if projectID == 0 {
				project, sprint, err := selectContextInteractively(runtime)
				if err != nil {
					return err
				}
				projectID = project.ID
				sprintID = sprint.ID
			}

			var detail api.ProjectDetail
			if err := runtime.client.Do("GET", fmt.Sprintf("/projects/%d", projectID), nil, &detail); err != nil {
				return err
			}

			selectedSprint := sprintID
			if selectedSprint == 0 {
				selectedSprint = runtime.config.SprintID
			}
			if selectedSprint == 0 && detail.ActiveSprint != nil {
				selectedSprint = detail.ActiveSprint.ID
			}
			if selectedSprint != 0 {
				found := false
				for _, sprint := range detail.Sprints {
					if sprint.ID == selectedSprint {
						found = true
						break
					}
				}
				if !found {
					return errors.New("迭代不存在或不属于当前项目")
				}
			}

			runtime.config.ProjectID = projectID
			runtime.config.SprintID = selectedSprint
			if err := saveConfig(runtime.configPath, *runtime.config); err != nil {
				return err
			}

			sprintName := "未设置"
			if selectedSprint != 0 {
				for _, sprint := range detail.Sprints {
					if sprint.ID == selectedSprint {
						sprintName = sprint.Name
						break
					}
				}
			}
			fmt.Printf("当前上下文：项目 %s（ID %d） · 迭代 %s（ID %d）\n",
				detail.Project.Name, projectID, sprintName, selectedSprint)
			return nil
		},
	}
	useCmd.Flags().Int64("project-id", 0, "默认项目 ID")
	useCmd.Flags().Int64("sprint-id", 0, "默认迭代 ID")

	showCmd := &cobra.Command{
		Use:   "show",
		Short: "查看当前 CLI 上下文",
		RunE: func(cmd *cobra.Command, args []string) error {
			runtime, err := newRuntime(cmd, false)
			if err != nil {
				return err
			}
			fmt.Printf("配置文件：%s\n", runtime.configPath)
			fmt.Printf("服务地址：%s（%s）\n", runtime.server, runtime.serverSource)
			fmt.Printf("Token 来源：%s\n", runtime.tokenSource)
			fmt.Printf("项目 ID：%d\n", runtime.config.ProjectID)
			fmt.Printf("迭代 ID：%d\n", runtime.config.SprintID)
			return nil
		},
	}

	context.AddCommand(useCmd, showCmd)
	root.AddCommand(context)
}

func selectContextInteractively(runtime *cliRuntime) (api.Project, api.Sprint, error) {
	reader := bufio.NewReader(os.Stdin)

	var organizations []api.Organization
	if err := runtime.client.Do("GET", "/organizations", nil, &organizations); err != nil {
		return api.Project{}, api.Sprint{}, err
	}
	if len(organizations) == 0 {
		return api.Project{}, api.Sprint{}, errors.New("当前账号没有可访问组织，请先在页面创建或加入组织")
	}

	organization, err := selectItem(reader, "选择组织", organizations,
		func(item api.Organization) string {
			return fmt.Sprintf("%s（ID %d）", item.Name, item.ID)
		})
	if err != nil {
		return api.Project{}, api.Sprint{}, err
	}

	var organizationDetail api.OrganizationDetail
	path := fmt.Sprintf("/organizations/%d", organization.ID)
	if err := runtime.client.Do("GET", path, nil, &organizationDetail); err != nil {
		return api.Project{}, api.Sprint{}, err
	}
	if len(organizationDetail.Projects) == 0 {
		return api.Project{}, api.Sprint{}, errors.New("所选组织下没有项目，请先在页面创建项目")
	}

	project, err := selectItem(reader, "选择项目", organizationDetail.Projects,
		func(item api.Project) string {
			team := item.TeamName
			if team == "" {
				team = "未设置团队"
			}
			return fmt.Sprintf("%s（ID %d · 团队 %s）", item.Name, item.ID, team)
		})
	if err != nil {
		return api.Project{}, api.Sprint{}, err
	}

	var projectDetail api.ProjectDetail
	projectPath := fmt.Sprintf("/projects/%d", project.ID)
	if err := runtime.client.Do("GET", projectPath, nil, &projectDetail); err != nil {
		return api.Project{}, api.Sprint{}, err
	}
	if len(projectDetail.Sprints) == 0 {
		return api.Project{}, api.Sprint{}, errors.New("所选项目下没有迭代，请先在页面创建迭代")
	}

	sprint, err := selectItem(reader, "选择迭代", projectDetail.Sprints,
		func(item api.Sprint) string {
			return fmt.Sprintf("%s（ID %d · %s · %s 至 %s）",
				item.Name, item.ID, item.StatusLabel, item.StartDate, item.EndDate)
		})
	if err != nil {
		return api.Project{}, api.Sprint{}, err
	}
	return project, sprint, nil
}

func selectItem[T any](reader *bufio.Reader, title string, items []T, format func(T) string) (T, error) {
	var zero T
	if len(items) == 0 {
		return zero, errors.New("没有可选项")
	}

	fmt.Printf("\n%s：\n", title)
	for index, item := range items {
		fmt.Printf("  %d. %s\n", index+1, format(item))
	}

	for {
		value, err := readLine(reader, "请输入序号: ")
		if err != nil {
			return zero, err
		}
		if value == "" {
			return zero, errors.New("未选择序号")
		}

		number, parseErr := strconv.Atoi(value)
		if parseErr != nil || number < 1 || number > len(items) {
			fmt.Printf("请输入 1 到 %d 之间的序号。\n", len(items))
			continue
		}
		return items[number-1], nil
	}
}
