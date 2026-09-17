package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type Client struct {
	server string
	token  string
	http   *http.Client
}

type APIError struct {
	Status  int
	Message string
}

func (err *APIError) Error() string {
	return fmt.Sprintf("服务端错误（HTTP %d）：%s", err.Status, err.Message)
}

func NewClient(server string, token string) *Client {
	return &Client{server: strings.TrimSpace(server), token: strings.TrimSpace(token), http: http.DefaultClient}
}

func (client *Client) Do(method string, path string, body any, output any) error {
	base, err := url.Parse(client.server)
	if err != nil || base.Scheme == "" || base.Host == "" {
		return errors.New("服务地址无效，必须包含协议和主机，例如 http://localhost:5001")
	}
	base.Path = strings.TrimSuffix(base.Path, "/") + "/api"
	relative, err := url.Parse(strings.TrimPrefix(path, "/"))
	if err != nil {
		return errors.New("无法构造 API 地址：" + err.Error())
	}
	endpoint := *base
	endpoint.Path = strings.TrimSuffix(base.Path, "/") + "/" + strings.Trim(relative.Path, "/")
	endpoint.RawQuery = relative.RawQuery

	content, err := json.Marshal(body)
	if err != nil {
		return errors.New("无法序列化请求数据：" + err.Error())
	}

	request, err := http.NewRequestWithContext(
		context.Background(),
		method,
		endpoint.String(),
		bytes.NewReader(content),
	)
	if err != nil {
		return errors.New("无法构造 API 请求：" + err.Error())
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	if client.token != "" {
		request.Header.Set("Authorization", "Bearer "+client.token)
	}

	response, err := client.http.Do(request)
	if err != nil {
		return errors.New("无法连接 PongCode 服务：" + err.Error())
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(response.Body, 10<<20))
	if err != nil {
		return errors.New("读取服务端响应失败：" + err.Error())
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return decodeAPIError(response.StatusCode, responseBody)
	}
	if output == nil {
		return nil
	}
	if err := json.Unmarshal(responseBody, output); err != nil {
		return errors.New("解析服务端响应失败：" + err.Error())
	}
	return nil
}

func decodeAPIError(status int, body []byte) error {
	var apiError struct {
		Error   string `json:"error"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(body, &apiError); err != nil || (apiError.Error == "" && apiError.Message == "") {
		preview := strings.TrimSpace(string(body))
		if preview == "" {
			preview = "无响应内容"
		}
		if len(preview) > 200 {
			preview = preview[:200]
		}
		return &APIError{Status: status, Message: preview}
	}
	if apiError.Error != "" {
		return &APIError{Status: status, Message: apiError.Error}
	}
	return &APIError{Status: status, Message: apiError.Message}
}
