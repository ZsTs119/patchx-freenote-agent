package remotemcp

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ZsTs119/patchxnote-agent/internal/api"
)

func TestProxyPreservesIDAndRefreshesOnceOnUnauthorized(t *testing.T) {
	var calls int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if calls == 1 {
			if r.Header.Get("Authorization") != "Bearer old_token" {
				t.Fatalf("expected old token, got %s", r.Header.Get("Authorization"))
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":"req-1","error":{"code":-32001,"message":"auth required","data":{"code":"auth_required"}}}`))
			return
		}
		if r.Header.Get("Authorization") != "Bearer new_token" {
			t.Fatalf("expected new token, got %s", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":"req-1","result":{"tools":[]}}`))
	}))
	defer server.Close()

	client, err := New(Options{ServerBaseURL: server.URL})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}
	proxy, err := NewProxy(ProxyOptions{Client: client, TokenProvider: &fakeTokenProvider{access: "old_token", refresh: "new_token"}})
	if err != nil {
		t.Fatalf("new proxy: %v", err)
	}
	var stdout bytes.Buffer
	if err := proxy.Serve(context.Background(), strings.NewReader(`{"jsonrpc":"2.0","id":"req-1","method":"tools/list"}`+"\n"), &stdout); err != nil {
		t.Fatalf("serve proxy: %v", err)
	}
	var response map[string]any
	if err := json.Unmarshal(bytes.TrimSpace(stdout.Bytes()), &response); err != nil {
		t.Fatalf("decode proxy response: %v\n%s", err, stdout.String())
	}
	if response["id"] != "req-1" || response["result"] == nil {
		t.Fatalf("unexpected proxy response: %+v", response)
	}
	if calls != 2 {
		t.Fatalf("expected retry after refresh, got %d calls", calls)
	}
}

func TestProxyMapsMalformedRemoteResponseToJSONRPCError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`not-json`))
	}))
	defer server.Close()

	client, err := New(Options{ServerBaseURL: server.URL})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}
	proxy, err := NewProxy(ProxyOptions{Client: client, TokenProvider: &fakeTokenProvider{access: "token"}})
	if err != nil {
		t.Fatalf("new proxy: %v", err)
	}
	var stdout bytes.Buffer
	if err := proxy.Serve(context.Background(), strings.NewReader(`{"jsonrpc":"2.0","id":7,"method":"initialize"}`+"\n"), &stdout); err != nil {
		t.Fatalf("serve proxy: %v", err)
	}
	var response struct {
		ID    int `json:"id"`
		Error struct {
			Data map[string]string `json:"data"`
		} `json:"error"`
	}
	if err := json.Unmarshal(bytes.TrimSpace(stdout.Bytes()), &response); err != nil {
		t.Fatalf("decode error response: %v\n%s", err, stdout.String())
	}
	if response.ID != 7 || response.Error.Data["code"] != "remote_protocol_error" {
		t.Fatalf("unexpected error response: %+v", response)
	}
}

type fakeTokenProvider struct {
	access     string
	refresh    string
	accessErr  error
	refreshErr error
}

func (f *fakeTokenProvider) AccessToken(ctx context.Context) (string, bool, error) {
	if f.accessErr != nil {
		return "", false, f.accessErr
	}
	if f.access == "" {
		return "", false, nil
	}
	return f.access, true, nil
}

func (f *fakeTokenProvider) RefreshNow(ctx context.Context) (string, bool, error) {
	if f.refreshErr != nil {
		return "", false, f.refreshErr
	}
	if f.refresh == "" {
		return "", false, nil
	}
	f.access = f.refresh
	return f.refresh, true, nil
}

func TestProxyClassifiesTokenFailures(t *testing.T) {
	for _, tc := range []struct {
		name              string
		afterUnauthorized bool
		err               error
		want              string
	}{
		{"initial_network", false, errors.New("temporary failure containing private connection details"), "token_refresh_failed"},
		{"initial_expired", false, &api.Error{StatusCode: 401, Code: "invalid_token"}, "auth_required"},
		{"initial_permission", false, &api.Error{StatusCode: 403, Code: "access_denied"}, "permission_denied"},
		{"retry_network", true, errors.New("temporary failure containing private connection details"), "token_refresh_failed"},
		{"retry_invalid_grant", true, &api.Error{StatusCode: 400, Code: "invalid_grant"}, "auth_required"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":9,"error":{"code":-32001,"message":"auth required"}}`))
			}))
			defer server.Close()
			client, err := New(Options{ServerBaseURL: server.URL})
			if err != nil {
				t.Fatal(err)
			}
			provider := &fakeTokenProvider{accessErr: tc.err}
			if tc.afterUnauthorized {
				provider = &fakeTokenProvider{access: "old_token", refreshErr: tc.err}
			}
			proxy, err := NewProxy(ProxyOptions{Client: client, TokenProvider: provider})
			if err != nil {
				t.Fatal(err)
			}
			body, respond := proxy.forward(context.Background(), []byte(`{"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"patchxnote_get_current_user","arguments":{}}}`))
			var result rpcResponse
			if err := json.Unmarshal(body, &result); err != nil {
				t.Fatal(err)
			}
			if !respond || result.Error == nil || result.Error.Data["code"] != tc.want {
				t.Fatalf("expected %s, got %s", tc.want, body)
			}
			wantCalls := 0
			if tc.afterUnauthorized {
				wantCalls = 1
			}
			if calls != wantCalls {
				t.Fatalf("expected %d MCP calls, got %d", wantCalls, calls)
			}
			if strings.Contains(string(body), "private connection details") {
				t.Fatal("raw error details leaked")
			}
		})
	}
}
