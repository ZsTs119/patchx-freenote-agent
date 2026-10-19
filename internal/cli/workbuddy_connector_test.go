package cli

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/ZsTs119/patchxnote-agent/internal/config"
	"github.com/ZsTs119/patchxnote-agent/internal/keychain"
	"github.com/ZsTs119/patchxnote-agent/internal/oauthflow"
)

// Local fixture acceptance of the connector command sequence. This does not
// exercise WorkBuddy UI, production SMS, or a real user's credentials.
func TestWorkBuddyConnectorLocalFlows(t *testing.T) {
	t.Setenv("PATCHXNOTE_MCP_MODE", "remote")
	for _, scenario := range []string{"connect", "recent_summaries", "copyable_note"} {
		t.Run(scenario, func(t *testing.T) {
			store := keychain.NewMemoryStore()
			profileStore := oauthflow.NewStore(store, "workbuddy")
			home := t.TempDir()
			var calls, refreshes atomic.Int32
			var challenge, redirectURI string
			access, refresh := "fixture_access", "fixture_refresh"
			var server *httptest.Server
			server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				w.Header().Set("Content-Type", "application/json")
				switch r.URL.Path {
				case "/.well-known/oauth-authorization-server":
					_ = json.NewEncoder(w).Encode(oauthMetadataForBase(server.URL))
				case "/v1/agent/oauth/authorize":
					q := r.URL.Query()
					challenge, redirectURI = q.Get("code_challenge"), q.Get("redirect_uri")
					if q.Get("client_id") != oauthflow.DefaultClientID || q.Get("code_challenge_method") != "S256" || challenge == "" {
						http.Error(w, "invalid fixture authorization", 400)
						return
					}
					callback, _ := url.Parse(redirectURI)
					values := callback.Query()
					values.Set("state", q.Get("state"))
					if q.Get("fixture_cancel") == "1" {
						values.Set("error", "access_denied")
					} else {
						values.Set("code", "fixture_code")
					}
					callback.RawQuery = values.Encode()
					http.Redirect(w, r, callback.String(), http.StatusFound)
				case "/v1/agent/oauth/token":
					_ = r.ParseForm()
					if r.Form.Get("grant_type") == "authorization_code" {
						hash := sha256.Sum256([]byte(r.Form.Get("code_verifier")))
						if r.Form.Get("code") != "fixture_code" || r.Form.Get("redirect_uri") != redirectURI || base64.RawURLEncoding.EncodeToString(hash[:]) != challenge {
							http.Error(w, "invalid fixture token exchange", 400)
							return
						}
					} else if r.Form.Get("grant_type") == "refresh_token" && r.Form.Get("refresh_token") == refresh {
						refreshes.Add(1)
						access, refresh = "fixture_access_rotated", "fixture_refresh_rotated"
					} else {
						http.Error(w, "unexpected fixture grant", 400)
						return
					}
					_ = json.NewEncoder(w).Encode(map[string]any{"access_token": access, "refresh_token": refresh, "token_type": "Bearer", "expires_in": 900, "refresh_token_expires_in": 2592000, "scope": "agent:account.read agent:content.read:mobile agent:webhook.write", "connector_session_id": "fixture_connector"})
				case "/v1/agent/oauth/revoke":
					_, _ = io.WriteString(w, `{}`)
				case "/mcp":
					var request struct {
						ID     json.RawMessage `json:"id"`
						Method string          `json:"method"`
						Params struct {
							Name      string         `json:"name"`
							Arguments map[string]any `json:"arguments"`
						} `json:"params"`
					}
					if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
						http.Error(w, "invalid fixture RPC", 400)
						return
					}
					if len(request.ID) == 0 {
						w.WriteHeader(202)
						return
					}
					var result any
					switch request.Method {
					case "initialize":
						result = map[string]any{"protocolVersion": "2025-06-18", "capabilities": map[string]any{}, "serverInfo": map[string]any{"name": "workbuddy-local-fixture", "version": "1"}}
					case "tools/list":
						result = map[string]any{"tools": []any{map[string]any{"name": "patchxnote_get_current_user"}, map[string]any{"name": "patchxnote_list_memories"}, map[string]any{"name": "patchxnote_render_webhook_message"}}}
					case "tools/call":
						if r.Header.Get("Authorization") != "Bearer "+access {
							http.Error(w, "fixture unauthorized", 401)
							return
						}
						var data any
						switch request.Params.Name {
						case "patchxnote_get_current_user":
							data = map[string]any{"status": "active"}
						case "patchxnote_list_memories":
							if request.Params.Arguments["platform"] != "mobile" {
								http.Error(w, "platform missing", 400)
								return
							}
							items := []any{}
							if scenario != "connect" {
								items = append(items, map[string]any{"id": "fixture_memory", "title": "Fixture recording", "summary": "A readable fixture summary."})
							}
							data = map[string]any{"items": items}
						case "patchxnote_render_webhook_message":
							if request.Params.Arguments["memory_id"] != "fixture_memory" || request.Params.Arguments["out"] != nil || request.Params.Arguments["save_draft"] == true {
								http.Error(w, "invalid remote draft arguments", 400)
								return
							}
							data = map[string]any{"markdown": "# Fixture note\n\nA readable fixture summary.", "remote_mode": "content"}
						default:
							http.Error(w, "unexpected fixture tool", 400)
							return
						}
						result = map[string]any{"structuredContent": data, "content": []any{map[string]any{"type": "text", "text": "fixture result"}}}
					default:
						http.Error(w, "unexpected fixture method", 400)
						return
					}
					_ = json.NewEncoder(w).Encode(map[string]any{"jsonrpc": "2.0", "id": request.ID, "result": result})
				default:
					http.NotFound(w, r)
				}
			}))
			defer server.Close()
			var host fixtureAuthorizationHost
			host.client = &http.Client{Timeout: 3 * time.Second}
			run := func(stdin string, args ...string) (string, error) {
				cmd := NewRootCommandWithDeps(Deps{TargetOS: "linux", PathEnv: config.PathEnv{HomeDir: home}, CredentialStore: store, Stdin: strings.NewReader(stdin), BrowserOpen: func(string) error { return fmt.Errorf("--no-browser must use host URL extraction") }})
				var stdout bytes.Buffer
				cmd.SetOut(&stdout)
				cmd.SetErr(&host)
				cmd.SetArgs(append([]string{"--profile", "workbuddy", "--server-base-url", server.URL}, args...))
				err := cmd.Execute()
				return stdout.String(), err
			}
			assertStatus := func(want bool) {
				t.Helper()
				before := calls.Load()
				out, err := run("", "mcp", "status", "--output", "json")
				if err != nil {
					t.Fatal(err)
				}
				var status mcpOAuthStatusResult
				if err := json.Unmarshal([]byte(out), &status); err != nil {
					t.Fatal(err)
				}
				if status.Authenticated != want || status.Profile != "workbuddy" {
					t.Fatal("incorrect local profile authentication state")
				}
				if calls.Load() != before {
					t.Fatal("status polling made a remote request")
				}
			}
			assertStatus(false)
			if scenario == "connect" {
				host.cancel = true
				if _, err := run("", "mcp", "login", "--no-browser", "--force", "--callback-timeout", "3s"); err == nil {
					t.Fatal("cancelled authorization succeeded")
				}
				assertStatus(false)
				host.cancel = false
				host.ignore = true
				if _, err := run("", "mcp", "login", "--no-browser", "--force", "--callback-timeout", "20ms"); err == nil {
					t.Fatal("authorization without a callback did not time out")
				}
				assertStatus(false)
				host.ignore = false
			}
			if _, err := run("", "mcp", "login", "--no-browser", "--force", "--callback-timeout", "3s"); err != nil {
				t.Fatal(err)
			}
			if host.opened == 0 {
				t.Fatal("host did not receive a login URL")
			}
			assertStatus(true)
			if scenario == "connect" {
				opened := host.opened
				if _, err := run("", "mcp", "login", "--no-browser"); err != nil {
					t.Fatal(err)
				}
				if host.opened != opened {
					t.Fatal("valid login opened an unnecessary browser flow")
				}
				if _, err := run("", "mcp", "login", "--no-browser", "--force", "--callback-timeout", "3s"); err != nil {
					t.Fatal(err)
				}
				if host.opened != opened+1 {
					t.Fatal("forced reauthorization reused the old login")
				}
			}
			if _, ok, err := oauthflow.NewStore(store, "default").Load(context.Background()); err != nil || ok {
				t.Fatal("login used a different profile")
			}
			requests := []string{`{"jsonrpc":"2.0","id":1,"method":"initialize"}`, `{"jsonrpc":"2.0","method":"notifications/initialized"}`, `{"jsonrpc":"2.0","id":2,"method":"tools/list"}`, `{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"patchxnote_get_current_user","arguments":{}}}`, `{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"patchxnote_list_memories","arguments":{"platform":"mobile","limit":5}}}`}
			if scenario == "copyable_note" {
				requests = append(requests, `{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"patchxnote_render_webhook_message","arguments":{"platform":"mobile","memory_id":"fixture_memory"}}}`)
			}
			out, err := run(strings.Join(requests, "\n")+"\n", "mcp", "serve")
			if err != nil {
				t.Fatal(err)
			}
			for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
				var rpc map[string]any
				if err := json.Unmarshal([]byte(line), &rpc); err != nil || rpc["result"] == nil || rpc["error"] != nil {
					t.Fatal("connector tool sequence did not succeed")
				}
			}
			if (scenario != "connect" && !strings.Contains(out, "fixture_memory")) || (scenario == "copyable_note" && !strings.Contains(out, "# Fixture note")) {
				t.Fatal("expected real fixture record/content output")
			}
			credential, ok, err := profileStore.Load(context.Background())
			if err != nil || !ok {
				t.Fatal("credential unavailable after command restart")
			}
			credential.Metadata.AccessTokenExpiresAt = time.Now().Add(-time.Second)
			if err := profileStore.Save(context.Background(), credential); err != nil {
				t.Fatal(err)
			}
			assertStatus(true)
			refreshedOutput, err := run(requests[3]+"\n", "mcp", "serve")
			if err != nil {
				t.Fatal(err)
			}
			if !strings.Contains(refreshedOutput, `"result"`) || strings.Contains(refreshedOutput, `"error"`) {
				t.Fatal("account read failed after automatic refresh")
			}
			updated, ok, err := profileStore.Load(context.Background())
			if err != nil || !ok || refreshes.Load() != 1 || updated.RefreshToken == credential.RefreshToken {
				t.Fatal("refresh did not rotate and persist credential")
			}
			if _, err := run("", "mcp", "logout"); err != nil {
				t.Fatal(err)
			}
			assertStatus(false)
			if scenario == "connect" {
				if _, err := run("", "mcp", "login", "--no-browser", "--force", "--callback-timeout", "3s"); err != nil {
					t.Fatal("reconnect failed after logout")
				}
				assertStatus(true)
				if _, err := run("", "mcp", "logout"); err != nil {
					t.Fatal(err)
				}
			}
		})
	}
}

// Simulates only WorkBuddy's documented extraction of an auth URL. It sends
// synthetic authorization to the local fixture, never to the production host.
type fixtureAuthorizationHost struct {
	client *http.Client
	cancel bool
	ignore bool
	opened int
}

func (h *fixtureAuthorizationHost) Write(p []byte) (int, error) {
	if h.ignore {
		return len(p), nil
	}
	for _, field := range strings.Fields(string(p)) {
		if !strings.HasPrefix(field, "http://127.0.0.1:") {
			continue
		}
		u, err := url.Parse(field)
		if err != nil || u.Path != "/v1/agent/oauth/authorize" {
			continue
		}
		if h.cancel {
			q := u.Query()
			q.Set("fixture_cancel", "1")
			u.RawQuery = q.Encode()
		}
		res, err := h.client.Get(u.String())
		if err != nil {
			return 0, fmt.Errorf("local fixture callback failed")
		}
		_, _ = io.Copy(io.Discard, res.Body)
		_ = res.Body.Close()
		h.opened++
	}
	return len(p), nil
}
