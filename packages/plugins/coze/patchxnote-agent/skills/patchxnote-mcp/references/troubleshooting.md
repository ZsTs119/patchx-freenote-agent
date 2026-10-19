# PatchX Freenote WorkBuddy Troubleshooting

Use this reference when WorkBuddy upload, auth, tool discovery, or PatchX Freenote tool calls fail.

## Upload Or Parse Failure

Check the zip first:

- Root contains `connector-meta.json`, `mcp.json`, `icon.svg`, and `skills/`.
- Files are not wrapped inside an unexpected parent directory.
- JSON files have no comments or trailing commas.
- `source` is kebab-case.
- The package is under 20MB.
- No `cli.json` or `token-schema.json` is present in the first MCP + Skill draft.

## Remote MCP Unreachable

The {{ENVIRONMENT}} endpoint for this package is:

```text
{{MCP_URL}}
```

If WorkBuddy cannot reach it, record HTTP status, stable error code, and timing only. Do not include tokens, raw content, phone numbers, or secrets in evidence.

## Authorization Failure

WorkBuddy MCP OAuth is separate from local npm `mcp login`.

Possible causes:

- OAuth protected resource metadata is unavailable or incompatible.
- Authorization server metadata is unavailable.
- Dynamic client registration is not accepted.
- PKCE validation fails.
- WorkBuddy callback URI is not accepted by the PatchX Freenote server.
- User closes the browser or authorization expires.

Ask the user to reconnect PatchX Freenote in WorkBuddy and complete phone-code authorization in the browser. Never ask for OTP, OAuth code, authorization code, access token, refresh token, or webhook secret in chat.

## Tools Not Listed

If no tools appear:

- Confirm the connector parsed `mcp.json`.
- Confirm WorkBuddy connected to the remote MCP endpoint.
- Confirm auth is complete if the endpoint requires auth.
- Re-run live tool discovery.

Do not hard-code a tool count from older docs.

## Empty Results

Check:

- Did the user select `mobile` or `desktop`?
- Is the account authenticated in this WorkBuddy connector session?
- Is pagination needed?
- Does the user actually have records for the chosen platform?

Do not infer that no PatchX Freenote data exists across every platform unless both platforms were queried and accepted by the user.

## Webhook Safety

Webhook configuration and send tools can cause external side effects. Use them only after explicit user intent and confirm the target alias and content source before sending.

If WorkBuddy review questions side effects, prepare a later reduced package revision that hides webhook write/send tools with `disabledTools` and updates examples and skill text accordingly.
