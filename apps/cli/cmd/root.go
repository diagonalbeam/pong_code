package cmd

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/liuxuejin008/pong_code/apps/cli/internal/api"
	"github.com/liuxuejin008/pong_code/apps/cli/internal/config"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

type cliRuntime struct {
	config       *config.Config
	configPath   string
	server       string
	serverSource string
	tokenSource  string
	client       *api.Client
}

func Execute() error {
	root := NewRootCmd()
	if err := root.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, "错误：", err)
		return err
	}
	return nil
}

func NewRootCmd() *cobra.Command {
	root := &cobra.Command{
		Use:   "pongcode",
		Short: "PongCode 命令行工具",
		Long:  "在本地命令行管理 PongCode 看板任务。",
	}
	root.PersistentFlags().String("server", "", "PongCode 服务地址，例如 http://localhost:5001")
	root.PersistentFlags().String("config", "", "CLI 配置文件路径")

	addAuthCommands(root)
	addContextCommands(root)
	addDiscoveryCommands(root)
	addRequirementCommands(root)
	addTaskCommands(root)
	return root
}

func loadConfigFile(cmd *cobra.Command) (*config.Config, string, error) {
	override, err := cmd.Flags().GetString("config")
	if err != nil {
		return nil, "", err
	}
	path, err := config.Path(override)
	if err != nil {
		return nil, "", err
	}
	loaded, err := config.Load(path)
	if err != nil {
		return nil, "", err
	}
	return loaded, path, nil
}

func saveConfig(path string, value config.Config) error {
	return config.Save(path, value)
}

func newRuntime(cmd *cobra.Command, requireToken bool) (*cliRuntime, error) {
	loaded, path, err := loadConfigFile(cmd)
	if err != nil {
		return nil, err
	}

	flagServer, err := cmd.Flags().GetString("server")
	if err != nil {
		return nil, err
	}
	server := strings.TrimSpace(flagServer)
	serverSource := "命令行参数"
	if server == "" {
		server = strings.TrimSpace(os.Getenv("PONGCODE_SERVER"))
		serverSource = "环境变量"
	}
	if server == "" && strings.TrimSpace(loaded.Server) != "" {
		server = strings.TrimSpace(loaded.Server)
		serverSource = "本地配置"
	}
	if server == "" {
		server = "http://localhost:5001"
		serverSource = "默认值"
	}

	token := strings.TrimSpace(os.Getenv("PONGCODE_TOKEN"))
	tokenSource := "环境变量"
	if token == "" {
		token = strings.TrimSpace(loaded.Token)
		tokenSource = "本地配置"
	}
	if token == "" {
		tokenSource = "未配置"
		if requireToken {
			return nil, errors.New("未配置 CLI Token，请运行 pongcode auth login 或设置 PONGCODE_TOKEN")
		}
	}

	return &cliRuntime{
		config:       loaded,
		configPath:   path,
		server:       server,
		serverSource: serverSource,
		tokenSource:  tokenSource,
		client:       api.NewClient(server, token),
	}, nil
}

func readLine(input io.Reader, prompt string) (string, error) {
	fmt.Print(prompt)
	reader, ok := input.(*bufio.Reader)
	if !ok {
		reader = bufio.NewReader(input)
	}
	value, err := reader.ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return "", errors.New("读取输入失败：" + err.Error())
	}
	return strings.TrimSpace(value), nil
}

func readSecret(prompt string) (string, error) {
	fmt.Print(prompt)
	if term.IsTerminal(int(os.Stdin.Fd())) {
		value, err := term.ReadPassword(int(os.Stdin.Fd()))
		fmt.Println()
		if err != nil {
			return "", errors.New("读取 CLI Token 失败：" + err.Error())
		}
		return strings.TrimSpace(string(value)), nil
	}

	value, err := readLine(os.Stdin, "")
	if err != nil {
		return "", err
	}
	fmt.Println()
	return value, nil
}

func stdinIsTerminal() bool {
	return term.IsTerminal(int(os.Stdin.Fd()))
}

func confirm(prompt string) (bool, error) {
	value, err := readLine(os.Stdin, prompt+"（y/N）: ")
	if err != nil {
		return false, err
	}
	return strings.EqualFold(value, "y") || strings.EqualFold(value, "yes"), nil
}
