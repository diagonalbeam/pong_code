package cmd

import (
	"io"
	"text/tabwriter"

	"github.com/liuxuejin008/pong_code/apps/cli/internal/api"
)

func statusLabel(status string) string {
	switch status {
	case "todo":
		return "待办"
	case "doing":
		return "进行中"
	case "done":
		return "已完成"
	default:
		return status
	}
}

func taskLabel(item api.BoardItem) string {
	if item.ItemType == "bug" {
		return "缺陷"
	}
	return "任务"
}

func newTable(output io.Writer) *tabwriter.Writer {
	return tabwriter.NewWriter(output, 0, 4, 2, ' ', 0)
}
