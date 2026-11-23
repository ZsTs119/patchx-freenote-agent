# WorkBuddy 工具与常用流程

已有有效授权时按主 Skill 选择用户要完成的任务，直接调用对应工具。只有授权或连接失败时才进入恢复流程；工具名称、可选参数和限制以本连接器的实时 schema 为准。

## 需求与工具

| 用户需求 | 工具 | 关键参数/后续 |
| --- | --- | --- |
| 连接检查、当前账户 | `patchxnote_get_current_user` | `{}`；成功才确认账户可访问 |
| 绑定的录音卡 | `patchxnote_list_recorder_cards` | `{}`；只展示返回的设备信息 |
| 剩余额度 | `patchxnote_get_quota_summary` | `{}` |
| 模型使用情况 | `patchxnote_get_model_usage_summary` | `{}` |
| 最近记录/总结 | `patchxnote_list_memories` | `limit`、`cursor`；`platform` 按用户指定来源选填 |
| 按关键词找记录 | `patchxnote_search_memories` | `query`，按需选填 `platform`；按当前服务的搜索说明处理 |
| 一条记录的详情/元数据 | `patchxnote_get_memory` | `memory_id` 来自列表/搜索，`platform` 沿用该记录来源 |
| 可复制的 Markdown 笔记 | `patchxnote_render_webhook_message` | `memory_id` 和已返回的 `platform`；读取返回的 Markdown |
| 可用模板 | `patchxnote_list_webhook_templates` | `{}`；选返回的模板标识 |
| 已配置的投递目标 | `patchxnote_list_webhook_targets` | 按需 `include_disabled` |
| 配置/移除目标 | `patchxnote_configure_webhook_target` / `patchxnote_remove_webhook_target` | 使用 `alias` 和当前 schema 的字段 |
| 用户明确要求投递 | `patchxnote_send_webhook` | `target_aliases`，以及用户选择的 `memory_id` 或 `markdown` |
| 查找 AI 处理记录 | `patchxnote_list_model_io_traces` | `platform`，按需日期、任务类型和分页 |
| 查看实际整理结果 | `patchxnote_get_model_io_parsed_result` / `patchxnote_get_model_io_packaged_result` | 使用实际返回的 `request_id` 或 `memory_id`，并明确 `platform` |
| 用户明确要求查看处理输入/响应 | `patchxnote_get_model_io_source_text` / `patchxnote_get_model_io_provider_response` | 同上；仅按用户需要读取相应字段 |
| 用户明确要求导出模型数据 | `patchxnote_export_model_io` | 先检查当前远程模式的内容返回能力，不能假定可写本地路径 |

## 最近记录

```json
{"limit":5}
```

将以上参数传给 `patchxnote_list_memories`，默认查询账号内记录。用户明确指定手机、桌面或 Web 时，再添加 `platform` 为 `mobile`、`desktop` 或 `web`。展示时保留来源和类型；时间范围由真实时间戳判断，不用标题推断日期。已保存结果、日总结和模型输出不统一称为原始录音。

“最近一次”从列表选最近的可读记录。调用详情时使用参数名 `memory_id`，值取真实记录 ID，不编造 ID，也不要求首次用户先提供“这条记录”。

搜索未找到时可以检查同一查询范围的列表；分页使用服务器返回的 cursor。计数时区分 `event_summary` 与 `daily_digest`，说明实际检查的范围，不把一页结果当成全账号统计。

## 三个业务示例

1. 账号状态和额度：`patchxnote_get_current_user({})` → `patchxnote_get_quota_summary({})`，展示返回的账号状态、额度和单位。两项均成功才算完成；不额外要求读取手机记录。
2. 最近五条记录或总结：`patchxnote_list_memories({"limit":5})` → 展示至多五条标题、时间、来源；不渲染全部正文。空列表如实说明。
3. 最近可读总结转笔记：列表 → 真实 `memory_id` 和来源 → `patchxnote_render_webhook_message` → 可读 Markdown → 直接展示笔记。标题、ID 和操作步骤不代替正文，待办只取自已有内容。

笔记首个候选明确没有可读内容时，再尝试其他候选；必要时使用返回的 cursor 继续查找。授权、权限或网络失败时先处理该错误，不以换记录或重新登录掩盖问题。没有找到可读内容就说明已检查的范围，该次笔记任务不能标记为成功。

渲染参数形状如下，两个值都来自同一条列表结果，不能直接使用示意占位符。当前渲染 schema 仅要求 memory_id；如果服务未返回来源，不自行猜测，按实时 schema 处理。

```json
{"memory_id":"<returned-id>","platform":"<returned-platform>"}
```

本连接器直接访问远程服务，渲染结果返回内容；不要设置 `save_draft=true`、`out` 或本地文件路径。不因工具名中有 webhook 就执行发送。

## 手动投递与模型字段

Webhook 配置、删除和发送按用户明确请求执行；先确认目标别名和内容来源，不从“整理成笔记”推导出发送动作。远程模式不使用本地 `draft_dir`。

模型字段按用户请求读取，使用列表返回的真实标识。普通总结查询优先读取整理结果，不默认获取完整原文或 provider payload。回复保留任务所需内容即可。
