package main

import (
	"os"

	"github.com/liuxuejin008/pong_code/apps/cli/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
}
