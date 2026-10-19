# PatchX Freenote WorkBuddy Workflows

Use this reference when the user wants WorkBuddy to use PatchX Freenote data after connector setup.

## Account And Record Lookup

Current user:

- Use `patchxnote_get_current_user`.
- Report only the safe account/profile projection returned by the tool.
- Do not ask for raw phone numbers, tokens, or account secrets.

Recent mobile records:

```json
{"platform":"mobile","limit":5}
```

Use `patchxnote_list_memories` for record entry points. Every content request must include `platform` as `mobile` or `desktop`. Do not merge platforms unless a future server contract explicitly adds that behavior.

Record detail:

- Use `patchxnote_get_memory` with the returned `id` and explicit `platform`.
- Treat metadata titles and snippets as record labels, not guaranteed original filenames.

Search:

- Use `patchxnote_search_memories` only according to the current MCP server's documented behavior.
- If search results are missing, list records first and search again only when appropriate.

## Counting Summary Records

For "which files did I summarize" or "how many summaries":

1. Inspect live tool availability if available tools are uncertain.
2. Page `patchxnote_list_memories` with the largest accepted page size and returned cursor.
3. Keep `event_summary` separate from `daily_digest`.
4. If counting source objects rather than rows, deduplicate `event_summary` records by `client_object_id` when that field is present.
5. State whether the count is complete, page-limited, filtered by platform, or based on currently returned records only.

Do not claim metadata titles are original local filenames.

## Model Result Inspection

Use model IO tools only when the user explicitly asks to inspect or export AI processing fields:

- `patchxnote_list_model_io_traces`
- `patchxnote_get_model_io_source_text`
- `patchxnote_get_model_io_provider_response`
- `patchxnote_get_model_io_parsed_result`
- `patchxnote_get_model_io_packaged_result`
- `patchxnote_export_model_io`

These tools may expose sensitive source text or AI payloads for the logged-in user. Summarize or transform only according to the user's current request. Do not paste complete transcripts, prompts, provider payloads, or raw model responses into public chats or documents.

## Markdown Drafts

Use `patchxnote_render_webhook_message` when the user wants an editable Markdown draft from a memory.

In WorkBuddy, do not assume access to the user's local filesystem. If the tool returns rendered content, present it for review. If a workflow requires writing a local file and the remote connector cannot do that, explain that this step requires a local desktop MCP setup or a future hosted export path.

## Webhook Workflow

PatchX Freenote webhook workflows are user-approved, manual side effects:

- `patchxnote_configure_webhook_target` stores webhook URL/secret material through the approved connector flow and returns only masked metadata.
- `patchxnote_list_webhook_targets` lists aliases and safe metadata.
- `patchxnote_send_webhook` sends only when the user explicitly asks for that send.
- `patchxnote_remove_webhook_target` removes target metadata and best-effort cleans stored secrets.

Before sending, confirm the target alias and content source. Do not create background pushes, recurring sends, or automatic forwarding.
