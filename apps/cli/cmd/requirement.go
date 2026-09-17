package cmd

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/liuxuejin008/pong_code/apps/cli/internal/api"
	"github.com/spf13/cobra"
)

func addRequirementCommands(root *cobra.Command) {
	requirementCmd := &cobra.Command{
		Use:     "requirement",
		Aliases: []string{"req"},
		Short:   "查询和创建需求",
		Long:    "查看需求 ID，并从 CLI 创建需求，不依赖网页。",
	}

	listCmd := &cobra.Command{
		Use:   "list",
		Short: "列出需求",
		Long:  "列出项目下的需求。使用 pongcode project list 可查看项目 ID。",
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

			query := url.Values{}
			if search, _ := cmd.Flags().GetString("search"); search != "" {
				query.Set("search", search)
			}
			if status, _ := cmd.Flags().GetString("status"); status != "" {
				if !validRequirementStatus(status) {
					return errors.New("需求状态必须是 pending、in_progress、testing 或 completed")
				}
				query.Set("status", status)
			}
			if cmd.Flags().Changed("priority") {
				priority, _ := cmd.Flags().GetInt("priority")
				if priority < 1 || priority > 5 {
					return errors.New("优先级必须在 1 到 5 之间")
				}
				query.Set("priority", strconv.Itoa(priority))
			}

			path := fmt.Sprintf("/projects/%d/requirements", projectID)
			if encoded := query.Encode(); encoded != "" {
				path += "?" + encoded
			}
			var requirements []api.Requirement
			if err := runtime.client.Do("GET", path, nil, &requirements); err != nil {
				return err
			}

			sprintID, err := cmd.Flags().GetInt64("sprint-id")
			if err != nil {
				return err
			}
			if sprintID != 0 {
				filtered := make([]api.Requirement, 0, len(requirements))
				for _, requirement := range requirements {
					if requirement.SprintID == sprintID {
						filtered = append(filtered, requirement)
					}
				}
				requirements = filtered
			}
			return printRequirements(os.Stdout, requirements)
		},
	}
	listCmd.Flags().Int64P("project-id", "p", 0, "项目 ID")
	listCmd.Flags().Int64("sprint-id", 0, "只显示指定迭代下的需求")
	listCmd.Flags().String("search", "", "按标题或内容搜索")
	listCmd.Flags().String("status", "", "pending、in_progress、testing 或 completed")
	listCmd.Flags().Int("priority", 0, "按优先级过滤：1 最高，5 最低")

	createCmd := &cobra.Command{
		Use:   "create",
		Short: "创建需求",
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

			title, err := cmd.Flags().GetString("title")
			if err != nil {
				return err
			}
			title = strings.TrimSpace(title)
			if title == "" {
				return errors.New("必须通过 --title 输入需求标题")
			}
			content, err := cmd.Flags().GetString("content")
			if err != nil {
				return err
			}
			content = strings.TrimSpace(content)
			if content == "" {
				return errors.New("必须通过 --content 输入需求内容")
			}
			priority, err := cmd.Flags().GetInt("priority")
			if err != nil {
				return err
			}
			if priority < 1 || priority > 5 {
				return errors.New("优先级必须在 1 到 5 之间")
			}
			status, err := cmd.Flags().GetString("status")
			if err != nil {
				return err
			}
			if !validRequirementStatus(status) {
				return errors.New("需求状态必须是 pending、in_progress、testing 或 completed")
			}
			sprintID, err := cmd.Flags().GetInt64("sprint-id")
			if err != nil {
				return err
			}
			if sprintID == 0 {
				sprintID = runtime.config.SprintID
			}

			body := map[string]any{
				"title":    title,
				"content":  content,
				"priority": priority,
				"status":   status,
			}
			if sprintID != 0 {
				body["sprint_id"] = sprintID
			}

			var requirement api.Requirement
			path := fmt.Sprintf("/projects/%d/requirements", projectID)
			if err := runtime.client.Do("POST", path, body, &requirement); err != nil {
				return err
			}
			fmt.Printf("已创建需求 %s（ID %d）\n", requirement.Title, requirement.ID)
			return nil
		},
	}
	createCmd.Flags().Int64P("project-id", "p", 0, "项目 ID")
	createCmd.Flags().Int64("sprint-id", 0, "绑定的迭代 ID；不传则不绑定迭代")
	createCmd.Flags().String("title", "", "需求标题")
	createCmd.Flags().String("content", "", "需求内容")
	createCmd.Flags().Int("priority", 3, "优先级：1 最高，5 最低")
	createCmd.Flags().String("status", "pending", "pending、in_progress、testing 或 completed")

	requirementCmd.AddCommand(listCmd, createCmd)
	root.AddCommand(requirementCmd)
}

func validRequirementStatus(value string) bool {
	return value == "pending" || value == "in_progress" ||
		value == "testing" || value == "completed"
}

func requirementStatus(value string) string {
	switch value {
	case "pending":
		return "待处理"
	case "in_progress":
		return "进行中"
	case "testing":
		return "测试中"
	case "completed":
		return "已完成"
	default:
		return value
	}
}

func printRequirements(file *os.File, requirements []api.Requirement) error {
	table := newTable(file)
	fmt.Fprintln(table, "需求ID\t标题\t状态\t优先级\t迭代ID\t迭代名称")
	for _, requirement := range requirements {
		fmt.Fprintf(table, "%d\t%s\t%s\t%d\t%d\t%s\n",
			requirement.ID, requirement.Title, requirementStatus(requirement.Status),
			requirement.Priority, requirement.SprintID, requirement.SprintName)
	}
	return table.Flush()
}
