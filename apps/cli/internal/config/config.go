package config

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Server    string `json:"server,omitempty"`
	Token     string `json:"cli_token,omitempty"`
	ProjectID int64  `json:"project_id,omitempty"`
	SprintID  int64  `json:"sprint_id,omitempty"`
}

func Path(override string) (string, error) {
	if strings.TrimSpace(override) != "" {
		return override, nil
	}
	if xdg := os.Getenv("XDG_CONFIG_HOME"); strings.TrimSpace(xdg) != "" {
		return filepath.Join(xdg, "pongcode", "config.json"), nil
	}

	userConfigDir, err := os.UserConfigDir()
	if err != nil {
		return "", errors.New("无法确定本机配置目录：" + err.Error())
	}
	return filepath.Join(userConfigDir, "pongcode", "config.json"), nil
}

func Load(path string) (*Config, error) {
	content, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return &Config{}, nil
	}
	if err != nil {
		return nil, errors.New("无法读取 CLI 配置：" + err.Error())
	}

	var result Config
	if err := json.Unmarshal(content, &result); err != nil {
		return nil, errors.New("CLI 配置格式无效：" + err.Error())
	}
	return &result, nil
}

func Save(path string, value Config) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return errors.New("无法创建 CLI 配置目录：" + err.Error())
	}

	content, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return errors.New("无法序列化 CLI 配置：" + err.Error())
	}
	if err := os.WriteFile(path, content, 0o600); err != nil {
		return errors.New("无法写入 CLI 配置：" + err.Error())
	}
	return os.Chmod(path, 0o600)
}
