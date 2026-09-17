package config

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestLoadMissingFileReturnsEmptyConfig(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	loaded, err := Load(path)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if loaded == nil || loaded.Server != "" || loaded.Token != "" {
		t.Fatalf("Load() = %+v, want empty config", loaded)
	}
}

func TestSaveProtectsFileAndLoadRoundTripsValues(t *testing.T) {
	path := filepath.Join(t.TempDir(), "pongcode", "config.json")
	value := Config{Server: "http://localhost:5001", Token: "token", ProjectID: 10, SprintID: 20}
	if err := Save(path, value); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("Stat() error = %v", err)
	}
	if runtime.GOOS != "windows" && info.Mode().Perm() != 0o600 {
		t.Fatalf("permission = %v, want 0600", info.Mode().Perm())
	}

	loaded, err := Load(path)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if *loaded != value {
		t.Fatalf("Load() = %+v, want %+v", *loaded, value)
	}
}

func TestInvalidConfigFailsLoudly(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	if err := os.WriteFile(path, []byte("{invalid"), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
	_, err := Load(path)
	if err == nil || !strings.Contains(err.Error(), "CLI 配置格式无效") {
		t.Fatalf("Load() error = %v, want invalid config error", err)
	}
}
