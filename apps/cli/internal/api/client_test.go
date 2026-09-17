package api

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestClientSendsBearerTokenAndDecodesResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if got := request.Header.Get("Authorization"); got != "Bearer test-token" {
			t.Errorf("Authorization = %q", got)
		}
		if request.URL.Path != "/api/auth/profile" {
			t.Errorf("path = %q", request.URL.Path)
		}
		body, err := io.ReadAll(request.Body)
		if err != nil {
			t.Fatalf("read request body: %v", err)
		}
		if len(body) != 0 {
			t.Errorf("GET request body = %q, want empty", body)
		}
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"user":{"id":1,"username":"ada","email":"ada@example.com"}}`))
	}))
	defer server.Close()

	var profile Profile
	client := NewClient(server.URL, "test-token")
	if err := client.Do("GET", "/auth/profile", nil, &profile); err != nil {
		t.Fatalf("Do() error = %v", err)
	}
	if profile.User.ID != 1 || profile.User.Username != "ada" {
		t.Fatalf("profile = %+v", profile)
	}
}

func TestClientReturnsServerErrorMessage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		http.Error(writer, `{"error":"无权访问"}`, http.StatusForbidden)
	}))
	defer server.Close()

	err := NewClient(server.URL, "test-token").Do("GET", "/auth/profile", nil, nil)
	var apiError *APIError
	if !errors.As(err, &apiError) {
		t.Fatalf("Do() error = %v, want APIError", err)
	}
	if apiError.Status != http.StatusForbidden || apiError.Message != "无权访问" {
		t.Fatalf("APIError = %+v", apiError)
	}
	if !strings.Contains(apiError.Error(), "HTTP 403") {
		t.Fatalf("Error() = %q", apiError.Error())
	}
}
