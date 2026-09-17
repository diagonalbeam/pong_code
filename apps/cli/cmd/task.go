package cmd

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/liuxuejin008/pong_code/apps/cli/internal/api"
	"github.com/spf13/cobra"
)

func addTaskContextFlags(cmd *cobra.Command) {
	cmd.Flags().Int64("project-id", 0, "项目 ID")
	cmd.Flags().Int64("sprint-id", 0, "迭代 ID")
}

func taskContext(cmd *cobra.Command, runtime *cliRuntime) (int64, int64, error) {
	projectID, err := cmd.Flags().GetInt64("project-id")
	if err != nil {
		return 0, 0, err
	}
	sprintID, err := cmd.Flags().GetInt64("sprint-id")
	if err != nil {
		return 0, 0, err
	}
	if projectID == 0 {
		projectID = runtime.config.ProjectID
	}
	if projectID == 0 {
		return 0, 0, errors.New("未指定项目，请使用 --project-id 或先执行 context use")
	}
	if sprintID == 0 {
		sprintID = runtime.config.SprintID
	}
	return projectID, sprintID, nil
}

func loadBoard(runtime *cliRuntime, projectID int64, sprintID int64) (*api.Board, error) {
	path := fmt.Sprintf("/projects/%d/board", projectID)
	if sprintID != 0 {
		path += fmt.Sprintf("?sprint_id=%d", sprintID)
	}
	var board api.Board
	if err := runtime.client.Do("GET", path, nil, &board); err != nil {
		return nil, err
	}
	if !board.HasSprint {
		return nil, errors.New("当前项目没有活跃迭代，请先用 context use --sprint-id 指定迭代")
	}
	return &board, nil
}

func addTaskCommands(root *cobra.Command) {
	task := &cobra.Command{Use: "task", Short: "管理看板任务"}

	listCmd := &cobra.Command{
		Use:   "list",
		Short: "列出当前迭代的任务",
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
			status, err := cmd.Flags().GetString("status")
			if err != nil {
				return err
			}
			if status != "" && !validStatus(status) {
				return errors.New("状态必须是 todo、doing 或 done")
			}

			var tasks []api.BoardItem
			for _, swimlane := range board.Swimlanes {
				tasks = append(tasks, swimlane.Todo...)
				tasks = append(tasks, swimlane.Doing...)
				tasks = append(tasks, swimlane.Done...)
			}
			return printTasks(os.Stdout, board, tasks, status)
		},
	}
	addTaskContextFlags(listCmd)
	listCmd.Flags().String("status", "", "按 todo、doing 或 done 过滤")

	showCmd := &cobra.Command{
		Use:   "show <task-id>",
		Short: "查看任务详情",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			runtime, err := newRuntime(cmd, true)
			if err != nil {
				return err
			}
			taskID, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil || taskID <= 0 {
				return errors.New("任务 ID 必须是正整数")
			}
			var detail api.IssueDetail
			if err := runtime.client.Do("GET", fmt.Sprintf("/issues/%d", taskID), nil, &detail); err != nil {
				return err
			}
			return printIssue(os.Stdout, detail.Issue)
		},
	}

	createCmd := &cobra.Command{
		Use:   "create",
		Short: "创建看板任务",
		RunE: func(cmd *cobra.Command, args []string) error {
			runtime, err := newRuntime(cmd, true)
			if err != nil {
				return err
			}
			title, err := cmd.Flags().GetString("title")
			if err != nil {
				return err
			}
			title = strings.TrimSpace(title)
			if title == "" {
				return errors.New("必须通过 --title 输入任务标题")
			}
			projectID, sprintID, err := taskContext(cmd, runtime)
			if err != nil {
				return err
			}
			if sprintID == 0 {
				var detail api.ProjectDetail
				path := fmt.Sprintf("/projects/%d", projectID)
				if err := runtime.client.Do("GET", path, nil, &detail); err != nil {
					return err
				}
				if detail.ActiveSprint == nil {
					return errors.New("当前项目没有活跃迭代，请通过 --sprint-id 指定迭代")
				}
				sprintID = detail.ActiveSprint.ID
			}

			description, _ := cmd.Flags().GetString("description")
			priority, _ := cmd.Flags().GetInt("priority")
			estimate, _ := cmd.Flags().GetFloat64("estimate-hours")
			if priority < 1 || priority > 5 {
				return errors.New("优先级必须在 1 到 5 之间")
			}
			if estimate < 0 {
				return errors.New("预估工时不能小于 0")
			}

			body := map[string]any{
				"title":         title,
				"description":   description,
				"priority":      priority,
				"time_estimate": estimate,
				"sprint_id":     sprintID,
			}
			if cmd.Flags().Changed("assignee-id") {
				assigneeID, _ := cmd.Flags().GetInt64("assignee-id")
				if assigneeID <= 0 {
					return errors.New("负责人 ID 必须是正整数")
				}
				body["assignee_id"] = assigneeID
			}
			if cmd.Flags().Changed("requirement-id") {
				requirementID, _ := cmd.Flags().GetInt64("requirement-id")
				if requirementID <= 0 {
					return errors.New("需求 ID 必须是正整数")
				}
				body["requirement_id"] = requirementID
			}

			var issue api.Issue
			path := fmt.Sprintf("/projects/%d/issues", projectID)
			if err := runtime.client.Do("POST", path, body, &issue); err != nil {
				return err
			}
			fmt.Printf("已创建任务 %s · %s（ID %d）\n", issue.ItemCode, issue.Title, issue.ID)
			return nil
		},
	}
	addTaskContextFlags(createCmd)
	createCmd.Flags().String("title", "", "任务标题")
	createCmd.Flags().String("description", "", "任务描述")
	createCmd.Flags().Int("priority", 3, "优先级：1 最高，5 最低")
	createCmd.Flags().Float64("estimate-hours", 0, "预估工时")
	createCmd.Flags().Int64("assignee-id", 0, "负责人 ID")
	createCmd.Flags().Int64("requirement-id", 0, "需求 ID")

	updateCmd := &cobra.Command{
		Use:   "update <task-id>",
		Short: "更新任务",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			runtime, err := newRuntime(cmd, true)
			if err != nil {
				return err
			}
			taskID, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil || taskID <= 0 {
				return errors.New("任务 ID 必须是正整数")
			}
			body := map[string]any{}
			if cmd.Flags().Changed("title") {
				title, _ := cmd.Flags().GetString("title")
				title = strings.TrimSpace(title)
				if title == "" {
					return errors.New("任务标题不能为空")
				}
				body["title"] = title
			}
			if cmd.Flags().Changed("description") {
				description, _ := cmd.Flags().GetString("description")
				body["description"] = description
			}
			if cmd.Flags().Changed("status") {
				status, _ := cmd.Flags().GetString("status")
				if !validStatus(status) {
					return errors.New("状态必须是 todo、doing 或 done")
				}
				body["status"] = status
			}
			if cmd.Flags().Changed("priority") {
				priority, _ := cmd.Flags().GetInt("priority")
				if priority < 1 || priority > 5 {
					return errors.New("优先级必须在 1 到 5 之间")
				}
				body["priority"] = priority
			}
			if cmd.Flags().Changed("estimate-hours") {
				estimate, _ := cmd.Flags().GetFloat64("estimate-hours")
				if estimate < 0 {
					return errors.New("预估工时不能小于 0")
				}
				body["time_estimate"] = estimate
			}
			if cmd.Flags().Changed("clear-assignee") {
				body["assignee_id"] = nil
			} else if cmd.Flags().Changed("assignee-id") {
				assigneeID, _ := cmd.Flags().GetInt64("assignee-id")
				if assigneeID <= 0 {
					return errors.New("负责人 ID 必须是正整数")
				}
				body["assignee_id"] = assigneeID
			}
			if cmd.Flags().Changed("clear-requirement") {
				body["requirement_id"] = nil
			} else if cmd.Flags().Changed("requirement-id") {
				requirementID, _ := cmd.Flags().GetInt64("requirement-id")
				if requirementID <= 0 {
					return errors.New("需求 ID 必须是正整数")
				}
				body["requirement_id"] = requirementID
			}
			if len(body) == 0 {
				return errors.New("请至少提供一个要更新的字段")
			}

			var issue api.Issue
			path := fmt.Sprintf("/issues/%d", taskID)
			if err := runtime.client.Do("PUT", path, body, &issue); err != nil {
				return err
			}
			fmt.Printf("已更新任务 %s · %s\n", issue.ItemCode, issue.Title)
			return nil
		},
	}
	updateCmd.Flags().String("title", "", "任务标题")
	updateCmd.Flags().String("description", "", "任务描述")
	updateCmd.Flags().String("status", "", "todo、doing 或 done")
	updateCmd.Flags().Int("priority", 3, "优先级")
	updateCmd.Flags().Float64("estimate-hours", 0, "预估工时")
	updateCmd.Flags().Int64("assignee-id", 0, "负责人 ID")
	updateCmd.Flags().Bool("clear-assignee", false, "清除负责人")
	updateCmd.Flags().Int64("requirement-id", 0, "需求 ID")
	updateCmd.Flags().Bool("clear-requirement", false, "清除需求关联")

	moveCmd := &cobra.Command{
		Use:   "move <task-id> <todo|doing|done>",
		Short: "移动任务状态",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			runtime, err := newRuntime(cmd, true)
			if err != nil {
				return err
			}
			taskID, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil || taskID <= 0 {
				return errors.New("任务 ID 必须是正整数")
			}
			if !validStatus(args[1]) {
				return errors.New("状态必须是 todo、doing 或 done")
			}
			body := map[string]any{"status": args[1]}
			var result api.Success
			path := fmt.Sprintf("/issues/%d/move", taskID)
			if err := runtime.client.Do("POST", path, body, &result); err != nil {
				return err
			}
			fmt.Printf("任务状态已移动到：%s\n", statusLabel(args[1]))
			return nil
		},
	}

	deleteCmd := &cobra.Command{
		Use:   "delete <task-id>",
		Short: "删除任务",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			runtime, err := newRuntime(cmd, true)
			if err != nil {
				return err
			}
			taskID, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil || taskID <= 0 {
				return errors.New("任务 ID 必须是正整数")
			}
			yes, err := cmd.Flags().GetBool("yes")
			if err != nil {
				return err
			}
			if !yes {
				confirmed, err := confirm("删除后任务和工时不可恢复，是否继续?")
				if err != nil {
					return err
				}
				if !confirmed {
					fmt.Println("已取消删除")
					return nil
				}
			}
			var result api.Success
			path := fmt.Sprintf("/issues/%d", taskID)
			if err := runtime.client.Do("DELETE", path, nil, &result); err != nil {
				return err
			}
			fmt.Printf("任务 %d 已删除\n", taskID)
			return nil
		},
	}
	deleteCmd.Flags().Bool("yes", false, "跳过删除确认")

	task.AddCommand(listCmd, showCmd, createCmd, updateCmd, moveCmd, deleteCmd)
	root.AddCommand(task)
}

func validStatus(value string) bool {
	return value == "todo" || value == "doing" || value == "done"
}

func printTasks(file *os.File, board *api.Board, items []api.BoardItem, status string) error {
	fmt.Printf("项目：%s · 迭代：%s\n", board.Project.Name, board.Sprint.Name)
	table := newTable(file)
	fmt.Fprintln(table, "ID\t编号\t标题\t需求\t状态\t优先级\t负责人")
	count := 0
	for _, item := range items {
		if item.ItemType == "bug" || (status != "" && item.Status != status) {
			continue
		}
		fmt.Fprintf(table, "%d\t%s\t%s\t%s\t%s\t%d\t%s\n",
			item.ID, displayCode(item), item.Title, item.RequirementTitle,
			statusLabel(item.Status), item.Priority, item.AssigneeName)
		count++
	}
	if err := table.Flush(); err != nil {
		return err
	}
	fmt.Printf("共 %d 个任务\n", count)
	return nil
}

func printIssue(file *os.File, issue api.Issue) error {
	table := newTable(file)
	fmt.Fprintln(table, "字段\t值")
	fmt.Fprintf(table, "ID\t%d\n", issue.ID)
	fmt.Fprintf(table, "编号\t%s\n", issue.ItemCode)
	fmt.Fprintf(table, "标题\t%s\n", issue.Title)
	fmt.Fprintf(table, "描述\t%s\n", issue.Description)
	fmt.Fprintf(table, "状态\t%s\n", statusLabel(issue.Status))
	fmt.Fprintf(table, "优先级\t%d\n", issue.Priority)
	fmt.Fprintf(table, "预估工时\t%.1f\n", issue.TimeEstimate)
	fmt.Fprintf(table, "已用工时\t%.1f\n", issue.TimeSpent)
	fmt.Fprintf(table, "负责人\t%s\n", issue.AssigneeName)
	fmt.Fprintf(table, "需求\t%s\n", issue.RequirementTitle)
	return table.Flush()
}
