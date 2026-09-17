package cmd_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	clipkg "github.com/liuxuejin008/pong_code/apps/cli/cmd"
	"github.com/liuxuejin008/pong_code/apps/cli/internal/config"
)

func runCommand(t *testing.T, stdin *os.File, args ...string) (string, error) {
	t.Helper()

	reader := os.Stdin
	if stdin != nil {
		os.Stdin = stdin
	}
	originalStdout := os.Stdout
	readFile, writeFile, err := os.Pipe()
	if err != nil {
		t.Fatalf("os.Pipe() error = %v", err)
	}
	os.Stdout = writeFile

	root := clipkg.NewRootCmd()
	root.SetOut(io.Discard)
	root.SetErr(io.Discard)
	root.SetArgs(args)
	commandError := root.Execute()

	writeFile.Close()
	os.Stdout = originalStdout
	os.Stdin = reader
	output, readErr := io.ReadAll(readFile)
	if readErr != nil {
		t.Fatalf("io.ReadAll() error = %v", readErr)
	}
	return string(output), commandError
}

func tempConfig(t *testing.T, value config.Config) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "config.json")
	if err := config.Save(path, value); err != nil {
		t.Fatalf("config.Save() error = %v", err)
	}
	return path
}

func TestAuthLoginValidatesAndSavesToken(t *testing.T) {
	t.Setenv("PONGCODE_TOKEN", "")
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if got := request.Header.Get("Authorization"); got != "Bearer cli-token" {
			t.Errorf("Authorization = %q", got)
		}
		_, _ = writer.Write([]byte(`{"user":{"id":1,"username":"ada","email":"ada@example.com"}}`))
	}))
	defer server.Close()

	path := filepath.Join(t.TempDir(), "config.json")
	tokenFile, err := os.CreateTemp(t.TempDir(), "stdin")
	if err != nil {
		t.Fatalf("CreateTemp() error = %v", err)
	}
	defer tokenFile.Close()
	defer os.Remove(tokenFile.Name())
	if _, err := tokenFile.WriteString("\ncli-token\n"); err != nil {
		t.Fatalf("WriteString() error = %v", err)
	}
	if _, err := tokenFile.Seek(0, 0); err != nil {
		t.Fatalf("Seek() error = %v", err)
	}

	output, err := runCommand(
		t,
		// 第一行留空表示接受 --server 传入的服务地址。
		tokenFile,
		"--config", path,
		"--server", server.URL,
		"auth", "login",
	)
	if err != nil {
		t.Fatalf("auth login error = %v, output = %q", err, output)
	}

	loaded, err := config.Load(path)
	if err != nil {
		t.Fatalf("config.Load() error = %v", err)
	}
	if loaded.Server != server.URL || loaded.Token != "cli-token" {
		t.Fatalf("config = %+v", loaded)
	}
	if !strings.Contains(output, "已登录：ada") {
		t.Fatalf("output = %q", output)
	}
}

func TestContextUseSetsDefaultProjectAndActiveSprint(t *testing.T) {
	t.Setenv("PONGCODE_TOKEN", "cli-token")
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/api/projects/10" {
			http.NotFound(writer, request)
			return
		}
		_, _ = writer.Write([]byte(`{
			"project":{"id":10,"name":"PongCode"},
			"active_sprint":{"id":20,"name":"Sprint 20"},
			"sprints":[{"id":20,"name":"Sprint 20"}]
		}`))
	}))
	defer server.Close()

	path := tempConfig(t, config.Config{})
	output, err := runCommand(
		t,
		nil,
		"--config", path,
		"--server", server.URL,
		"context", "use", "--project-id", "10",
	)
	if err != nil {
		t.Fatalf("context use error = %v, output = %q", err, output)
	}

	loaded, err := config.Load(path)
	if err != nil {
		t.Fatalf("config.Load() error = %v", err)
	}
	if loaded.ProjectID != 10 || loaded.SprintID != 20 {
		t.Fatalf("config = %+v", loaded)
	}
}

func TestContextUseInteractiveSelectionSavesIDs(t *testing.T) {
	t.Setenv("PONGCODE_TOKEN", "cli-token")
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/api/organizations":
			_, _ = writer.Write([]byte(`[{"id":10,"name":"Org"}]`))
		case "/api/organizations/10":
			_, _ = writer.Write([]byte(`{
				"organization":{"id":10,"name":"Org"},
				"projects":[{"id":10,"name":"PongCode","organization_id":10,"team_name":"Core"}]
			}`))
		case "/api/projects/10":
			_, _ = writer.Write([]byte(`{
				"project":{"id":10,"name":"PongCode"},
				"sprints":[{"id":20,"name":"Sprint 20","status_label":"进行中","start_date":"2026-09-01","end_date":"2026-09-15"}]
			}`))
		default:
			t.Errorf("unexpected request %s %s", request.Method, request.URL.Path)
			http.NotFound(writer, request)
		}
	}))
	defer server.Close()

	path := tempConfig(t, config.Config{})
	stdin, err := os.CreateTemp(t.TempDir(), "stdin")
	if err != nil {
		t.Fatalf("CreateTemp() error = %v", err)
	}
	defer stdin.Close()
	if _, err := stdin.WriteString("1\n1\n1\n"); err != nil {
		t.Fatalf("WriteString() error = %v", err)
	}
	if _, err := stdin.Seek(0, 0); err != nil {
		t.Fatalf("Seek() error = %v", err)
	}

	output, err := runCommand(
		t,
		stdin,
		"--config", path,
		"--server", server.URL,
		"context", "use",
	)
	if err != nil {
		t.Fatalf("context use error = %v, output = %q", err, output)
	}

	loaded, err := config.Load(path)
	if err != nil {
		t.Fatalf("config.Load() error = %v", err)
	}
	if loaded.ProjectID != 10 || loaded.SprintID != 20 {
		t.Fatalf("config = %+v, want project 10 sprint 20", loaded)
	}
	if !strings.Contains(output, "PongCode（ID 10") ||
		!strings.Contains(output, "Sprint 20（ID 20") {
		t.Fatalf("output = %q", output)
	}
}

func TestTaskListUsesBearerTokenAndContext(t *testing.T) {
	t.Setenv("PONGCODE_TOKEN", "cli-token")
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if got := request.Header.Get("Authorization"); got != "Bearer cli-token" {
			t.Errorf("Authorization = %q", got)
		}
		if request.URL.Path != "/api/projects/10/board" || request.URL.Query().Get("sprint_id") != "20" {
			t.Errorf("request = %s?%s", request.URL.Path, request.URL.RawQuery)
			http.NotFound(writer, request)
			return
		}
		_, _ = writer.Write([]byte(`{
			"has_sprint":true,
			"project":{"id":10,"name":"PongCode"},
			"sprint":{"id":20,"name":"Sprint 20"},
			"swimlanes":[{
				"requirement":{"id":30,"title":"CLI"},
				"todo":[{"id":40,"item_code":"CLI-001","title":"Write CLI","status":"todo","priority":3,"item_type":"task"}],
				"doing":[],
				"done":[{"id":41,"item_code":"BUG-001","title":"Closed bug","status":"closed","priority":"normal","item_type":"bug"}]
			}]
		}`))
	}))
	defer server.Close()

	path := tempConfig(t, config.Config{ProjectID: 10, SprintID: 20})
	output, err := runCommand(
		t,
		nil,
		"--config", path,
		"--server", server.URL,
		"task", "list",
	)
	if err != nil {
		t.Fatalf("task list error = %v, output = %q", err, output)
	}
	if !strings.Contains(output, "CLI-001") || !strings.Contains(output, "Write CLI") {
		t.Fatalf("output = %q", output)
	}
	if strings.Contains(output, "BUG-001") || strings.Contains(output, "Closed bug") {
		t.Fatalf("output includes bug = %q", output)
	}
}

func TestTaskCreateUsesActiveSprintAndSendsPayload(t *testing.T) {
	t.Setenv("PONGCODE_TOKEN", "cli-token")
	var createdBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch {
		case request.Method == "GET" && request.URL.Path == "/api/projects/10":
			_, _ = writer.Write([]byte(`{
				"project":{"id":10,"name":"PongCode"},
				"active_sprint":{"id":20,"name":"Sprint 20"},
				"sprints":[{"id":20,"name":"Sprint 20"}]
			}`))
		case request.Method == "POST" && request.URL.Path == "/api/projects/10/issues":
			if err := json.NewDecoder(request.Body).Decode(&createdBody); err != nil {
				t.Errorf("decode request = %v", err)
			}
			_, _ = writer.Write([]byte(`{"id":40,"item_code":"CLI-001","title":"Write CLI","status":"todo"}`))
		default:
			t.Errorf("unexpected request %s %s", request.Method, request.URL.Path)
			http.NotFound(writer, request)
		}
	}))
	defer server.Close()

	path := tempConfig(t, config.Config{ProjectID: 10})
	output, err := runCommand(
		t,
		nil,
		"--config", path,
		"--server", server.URL,
		"task", "create", "--title", "Write CLI", "--priority", "2",
	)
	if err != nil {
		t.Fatalf("task create error = %v, output = %q", err, output)
	}
	if createdBody["sprint_id"] != float64(20) || createdBody["title"] != "Write CLI" || createdBody["priority"] != float64(2) {
		t.Fatalf("created body = %#v", createdBody)
	}
	if !strings.Contains(output, "已创建任务 CLI-001") {
		t.Fatalf("output = %q", output)
	}
}

func TestRequirementListShowsIDs(t *testing.T) {
	t.Setenv("PONGCODE_TOKEN", "cli-token")
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/api/projects/10/requirements" ||
			request.URL.Query().Get("search") != "login" ||
			request.URL.Query().Get("status") != "pending" {
			t.Errorf("unexpected request %s?%s", request.URL.Path, request.URL.RawQuery)
			http.NotFound(writer, request)
			return
		}
		_, _ = writer.Write([]byte(`[
			{"id":30,"title":"Login requirement","status":"pending","priority":2,"sprint_id":20,"sprint_name":"Sprint 20"}
		]`))
	}))
	defer server.Close()

	path := tempConfig(t, config.Config{ProjectID: 10})
	output, err := runCommand(
		t,
		nil,
		"--config", path,
		"--server", server.URL,
		"requirement", "list", "--search", "login", "--status", "pending",
	)
	if err != nil {
		t.Fatalf("requirement list error = %v, output = %q", err, output)
	}
	if !strings.Contains(output, "30") || !strings.Contains(output, "Login requirement") {
		t.Fatalf("output = %q", output)
	}
}

func TestRequirementCreateSendsPayloadAndShowsID(t *testing.T) {
	t.Setenv("PONGCODE_TOKEN", "cli-token")
	var createdBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != "POST" || request.URL.Path != "/api/projects/10/requirements" {
			t.Errorf("unexpected request %s %s", request.Method, request.URL.Path)
			http.NotFound(writer, request)
			return
		}
		if err := json.NewDecoder(request.Body).Decode(&createdBody); err != nil {
			t.Errorf("decode request = %v", err)
		}
		_, _ = writer.Write([]byte(`{"id":30,"title":"Login requirement"}`))
	}))
	defer server.Close()

	path := tempConfig(t, config.Config{})
	output, err := runCommand(
		t,
		nil,
		"--config", path,
		"--server", server.URL,
		"requirement", "create",
		"--project-id", "10",
		"--sprint-id", "20",
		"--title", "Login requirement",
		"--content", "Cover login flow",
		"--priority", "2",
	)
	if err != nil {
		t.Fatalf("requirement create error = %v, output = %q", err, output)
	}

	want := map[string]any{
		"title":     "Login requirement",
		"content":   "Cover login flow",
		"priority":  float64(2),
		"status":    "pending",
		"sprint_id": float64(20),
	}
	for key, value := range want {
		if createdBody[key] != value {
			t.Fatalf("created body[%q] = %#v, want %#v; body=%#v", key, createdBody[key], value, createdBody)
		}
	}
	if !strings.Contains(output, "已创建需求 Login requirement（ID 30）") {
		t.Fatalf("output = %q", output)
	}
}
