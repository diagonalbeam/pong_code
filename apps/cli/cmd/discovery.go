package cmd

import (
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/liuxuejin008/pong_code/apps/cli/internal/api"
	"github.com/spf13/cobra"
)

func addDiscoveryCommands(root *cobra.Command) {
	orgCmd := &cobra.Command{
		Use:   "org",
		Short: "查看组织",
	}
	orgCmd.AddCommand(&cobra.Command{
		Use:   "list",
		Short: "列出可访问组织",
		RunE: func(cmd *cobra.Command, args []string) error {
			runtime, err := newRuntime(cmd, true)
			if err != nil {
				return err
			}
			var organizations []api.Organization
			if err := runtime.client.Do("GET", "/organizations", nil, &organizations); err != nil {
				return err
			}
			return printOrganizations(os.Stdout, organizations)
		},
	})

	projectCmd := &cobra.Command{
		Use:   "project",
		Short: "查看项目",
	}
	listProjects := &cobra.Command{
		Use:   "list",
		Short: "列出可访问项目",
		RunE: func(cmd *cobra.Command, args []string) error {
			runtime, err := newRuntime(cmd, true)
			if err != nil {
				return err
			}
			orgID, err := cmd.Flags().GetInt64("org-id")
			if err != nil {
				return err
			}
			var organizations []api.Organization
			if orgID == 0 {
				if err := runtime.client.Do("GET", "/organizations", nil, &organizations); err != nil {
					return err
				}
			} else {
				var detail api.OrganizationDetail
				if err := runtime.client.Do("GET", fmt.Sprintf("/organizations/%d", orgID), nil, &detail); err != nil {
					return err
				}
				detail.Projects = setOrganization(detail.Projects, detail.Organization)
				return printProjects(os.Stdout, detail.Projects)
			}

			var projects []api.Project
			for _, organization := range organizations {
				var detail api.OrganizationDetail
				path := fmt.Sprintf("/organizations/%d", organization.ID)
				if err := runtime.client.Do("GET", path, nil, &detail); err != nil {
					return err
				}
				projects = append(projects, setOrganization(detail.Projects, organization)...)
			}
			return printProjects(os.Stdout, projects)
		},
	}
	listProjects.Flags().Int64("org-id", 0, "仅列出指定组织下的项目")
	projectCmd.AddCommand(listProjects)

	sprintCmd := &cobra.Command{
		Use:   "sprint",
		Short: "查看迭代",
	}
	listSprints := &cobra.Command{
		Use:   "list",
		Short: "列出项目迭代",
		Long:  "列出项目下的迭代。使用 pongcode project list 可查看项目 ID。",
		RunE: func(cmd *cobra.Command, args []string) error {
			runtime, err := newRuntime(cmd, true)
			if err != nil {
				return err
			}
			projectID, err := cmd.Flags().GetInt64("project-id")
			if err != nil {
				return err
			}
			if projectID == 0 {
				projectID = runtime.config.ProjectID
			}
			if projectID == 0 {
				return errors.New("未指定项目。请先执行 pongcode project list 查看项目 ID，或执行 pongcode context use 交互选择")
			}
			var detail api.ProjectDetail
			if err := runtime.client.Do("GET", fmt.Sprintf("/projects/%d", projectID), nil, &detail); err != nil {
				return err
			}
			return printSprints(os.Stdout, detail.Sprints)
		},
	}
	listSprints.Flags().Int64P("project-id", "p", 0, "项目 ID")
	sprintCmd.AddCommand(listSprints)

	boardCmd := &cobra.Command{
		Use:   "board",
		Short: "只读查看看板",
	}
	showBoard := &cobra.Command{
		Use:   "show",
		Short: "显示看板泳道",
		RunE: func(cmd *cobra.Command, args []string) error {
			runtime, err := newRuntime(cmd, true)
			if err != nil {
				return err
			}
			projectID, sprintID, err := taskContext(cmd, runtime)
			if err != nil {
				return err
			}
			board, err := loadBoard(runtime, projectID, sprintID)
			if err != nil {
				return err
			}
			return printBoard(os.Stdout, board)
		},
	}
	addTaskContextFlags(showBoard)
	boardCmd.AddCommand(showBoard)

	root.AddCommand(orgCmd, projectCmd, sprintCmd, boardCmd)
}

func setOrganization(projects []api.Project, organization api.Organization) []api.Project {
	for index := range projects {
		projects[index].OrganizationName = organization.Name
	}
	return projects
}

func printOrganizations(file *os.File, organizations []api.Organization) error {
	table := newTable(file)
	fmt.Fprintln(table, "组织ID\t组织名称")
	for _, organization := range organizations {
		fmt.Fprintf(table, "%d\t%s\n", organization.ID, organization.Name)
	}
	return table.Flush()
}

func printProjects(file *os.File, projects []api.Project) error {
	table := newTable(file)
	fmt.Fprintln(table, "项目ID\t项目名称\t组织ID\t组织名称\t团队")
	for _, project := range projects {
		fmt.Fprintf(table, "%d\t%s\t%d\t%s\t%s\n",
			project.ID, project.Name, project.OrganizationID,
			project.OrganizationName, project.TeamName)
	}
	return table.Flush()
}

func printSprints(file *os.File, sprints []api.Sprint) error {
	table := newTable(file)
	fmt.Fprintln(table, "迭代ID\t迭代名称\t状态\t开始日期\t结束日期")
	for _, sprint := range sprints {
		fmt.Fprintf(table, "%d\t%s\t%s\t%s\t%s\n",
			sprint.ID, sprint.Name, sprint.StatusLabel, sprint.StartDate, sprint.EndDate)
	}
	return table.Flush()
}

func printBoard(file *os.File, board *api.Board) error {
	fmt.Printf("组织：%s · 项目：%s · 迭代：%s\n",
		board.Organization.Name, board.Project.Name, board.Sprint.Name)
	fmt.Println()

	table := newTable(file)
	fmt.Fprintln(table, "泳道\t类型\t编号\t标题\t状态\t负责人")
	for _, swimlane := range board.Swimlanes {
		swimlaneName := "未关联需求"
		if swimlane.Requirement != nil {
			swimlaneName = swimlane.Requirement.Title
		}
		items := append(swimlane.Todo, swimlane.Doing...)
		items = append(items, swimlane.Done...)
		for _, item := range items {
			status := item.BoardStatus
			if status == "" {
				status = item.Status
			}
			fmt.Fprintf(table, "%s\t%s\t%s\t%s\t%s\t%s\n",
				swimlaneName, taskLabel(item), displayCode(item), item.Title,
				statusLabel(status), item.AssigneeName)
		}
	}
	return table.Flush()
}

func displayCode(item api.BoardItem) string {
	if item.ItemCode == "" {
		return "#" + strconv.FormatInt(item.ID, 10)
	}
	return item.ItemCode
}
