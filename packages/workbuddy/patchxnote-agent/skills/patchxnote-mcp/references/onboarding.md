# PatchXNote WorkBuddy Connector Onboarding

Use this reference when WorkBuddy is installing, connecting, repairing, or verifying the PatchXNote connector.

## Connector Context

This package uses WorkBuddy MCP + Skill:

- `connector-meta.json` describes the connector.
- `mcp.json` points WorkBuddy to the remote PatchXNote MCP endpoint.
- `skills/patchxnote-mcp/SKILL.md` teaches AI how to use the PatchXNote tools safely.

Do not switch this connector into CLI + Skill behavior unless a future package revision explicitly adds `cli.json` and updates the acceptance evidence.

## Remote MCP Endpoint

This package uses the PatchXNote {{ENVIRONMENT}} remote MCP endpoint:

```text
{{MCP_URL}}
```

This is a platform connector endpoint, not a local stdio command. Do not ask the user to run `npx` while using this WorkBuddy connector.

## Browser Authorization

If WorkBuddy asks the user to connect PatchXNote, the user should complete PatchXNote authorization in the browser opened by WorkBuddy or PatchXNote.

The user enters the phone verification code on the PatchXNote authorization page. Never ask for OTP codes, OAuth codes, authorization codes, PKCE values, access tokens, refresh tokens, or webhook secrets in chat.

If authorization fails, ask the user to reconnect the PatchXNote connector in WorkBuddy. Record this as an auth acceptance issue, not a zip packaging issue.

## Verification

After WorkBuddy loads the connector:

1. Confirm the connector upload parsed successfully.
2. Confirm the connector can connect or prompt browser authorization.
3. Inspect live MCP tools with `tools/list`.
4. Call `patchxnote_get_current_user`.
5. Call `patchxnote_list_memories` with:

```json
{"platform":"mobile","limit":5}
```

Use the observed tool list and real tool-call result as evidence. Do not infer WorkBuddy platform acceptance from local npm or GitHub evidence.

## Evidence Wording

Use precise states:

- `uploaded`: the zip was accepted by the upload form.
- `parsed`: WorkBuddy parsed connector metadata and showed the connector.
- `authenticated`: browser authorization completed and WorkBuddy can call authorized MCP tools.
- `tools_listed`: WorkBuddy listed PatchXNote MCP tools.
- `real_tool_called`: a PatchXNote tool returned a successful result.
- `platform_accepted`: WorkBuddy upload, auth, tool listing, and at least one real safe tool call passed in the actual platform.
