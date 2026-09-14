# PatchXNote MCP Test Environment Onboarding

This generated package targets the test API `{{API_BASE_URL}}` and Remote MCP endpoint `{{MCP_URL}}`. Keep the normal PatchXNote installation and browser authorization flow, with an explicit test server address. Installing this Skill does not change an existing client configuration or login.

## Local Clients

Identify the actual client (`codex`, `claude-code`, or another supported local client) and run setup in the same OS/runtime that will launch MCP:

```sh
npx -y patchxnote-agent@latest setup --client <client-id> --server-base-url {{API_BASE_URL}}
```

If Skill installation is needed, the existing command remains:

```sh
npx -y patchxnote-agent@latest skill install
```

The npm-installed Skill describes the default production environment. For this explicitly selected test connection, continue to use the server override in the commands below and in the MCP host's startup configuration.

If the client ID is unknown or setup returns manual steps, print the existing generic config with the same server address:

```sh
npx -y patchxnote-agent@latest mcp config --server-base-url {{API_BASE_URL}}
```

Apply the printed configuration to the intended client. Preserve unrelated MCP entries; replace an existing PatchXNote entry only when requested. Check that its startup command/environment retains the test address instead of falling back to the CLI's production default.

## Browser Login And Verification

```sh
npx -y patchxnote-agent@latest mcp login --server-base-url {{API_BASE_URL}}
npx -y patchxnote-agent@latest mcp status --verify --server-base-url {{API_BASE_URL}}
```

Complete phone verification in the browser. Do not paste OTP, OAuth codes, access tokens, refresh tokens, or webhook secrets into chat. `mcp serve` does not open a browser on startup.

Credentials are server-specific. Test and production records or logins do not migrate automatically. When retaining both environments, use separate profiles with explicit server addresses consistently for setup, login, status and MCP startup.

Then discover the live tools, call `patchxnote_get_current_user`, and call `patchxnote_list_memories` with:

```json
{"platform":"mobile","limit":5}
```

Report the actual result; use live tool discovery if tool count matters.

## Hosted Clients

Use `{{MCP_URL}}` in the platform's Remote MCP/custom connector settings, and complete its browser authorization flow. Hosted clients cannot run the user's local `npx`. A local setup result does not prove hosted platform acceptance.
