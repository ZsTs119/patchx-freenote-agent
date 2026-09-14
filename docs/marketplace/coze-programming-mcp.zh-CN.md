# PatchXFreeNote：扣子编程 MCP OAuth 接入

本指南用于“扣子编程 → 资源库 → 新建插件 → MCP → OAuth standard”。现有 `coze` ZIP 面向另一种插件包导入入口，此处直接填写服务地址和 OAuth 字段。Agent 安装命令、运行时和渠道生成器保持现状。

截至 2026-09-14，主体和限定测试已完成，实际测试客户端已准备；客户端仍为 `disabled`、回调待填。在线服务器尚未部署本次兼容代码，扣子插件尚未创建/授权，生产客户端尚未准备。不要把下方可填写资料视为在线授权已经通过。

## 1. 已准备的测试填写资料

这些值来自 GoServer 维护命令实际执行结果，配置为 `volumes/patchx-note-server/.config.test-deploy.yaml`。

| 扣子字段 | 测试填写值 |
| --- | --- |
| 名称 | `PatchXFreeNote` |
| 类型 / 授权方式 | `MCP` / `OAuth → standard` |
| 插件 URL | `https://ws-lab.patch-x.cn/patchnote-test-api/mcp` |
| client_id | `patchxfreenote-coze-test` |
| client_secret | 从本机私密交接文件复制对应值到扣子后台，见下一节。 |
| client_url | `https://ws-lab.patch-x.cn/patchnote-test-api/v1/agent/oauth/authorize` |
| authorization_url | `https://ws-lab.patch-x.cn/patchnote-test-api/v1/agent/oauth/token` |
| authorization_content_type | `application/x-www-form-urlencoded`，将页面默认 JSON 改为此项。 |
| Header 列表 | 保留适用的 `User-Agent: Coze/1.0`；用户 Bearer token 由扣子在授权后携带。 |

`scope` 原样复制以下一行，空格分隔：

```text
agent:account.read agent:content.read:desktop agent:content.read:mobile agent:hardware.read agent:model_io.read agent:model_usage.read agent:quota.read agent:webhook.read agent:webhook.send agent:webhook.write
```

`client_id` 是我们服务端的 OAuth 应用标识；扣子插件 ID 在创建插件后取得，两者不同。`client_url` 打开我们的浏览器授权页，`authorization_url` 用授权码换取 token。字段含义与编码选项依据[扣子 OAuth 文档](https://docs.coze.cn/guides_oauth_plugin)。

## 2. 客户端密钥与准备操作

密钥是服务端维护命令自动生成的随机应用凭据，数据库只保存 SHA-256 哈希。原值保存在 GoServer 仓库下的私密文件：

```text
volumes/patchx-note-server/.secrets/coze-programming-test.json
```

文件权限为 `0600`，已被 Git 忽略，包含 `client_id` 与 `client_secret`。维护者在本机私密编辑器查看并直接填入扣子后台；不要把文件内容交给聊天、公共文档、上架 ZIP 或终端日志。它不是用户短信验证码，也不是用户 access token。

以下命令在 GoServer 仓库根目录执行，使用 Go 1.26.5。本机可使用 `~/.local/go1.26.5/bin/go`；其他维护环境使用对应的 Go 1.26.5 可执行文件。

```sh
GOMAXPROCS=1 ~/.local/go1.26.5/bin/go run -p 1 ./cmd/agentoauthclient prepare \
  --config volumes/patchx-note-server/.config.test-deploy.yaml \
  --client-id patchxfreenote-coze-test \
  --handoff-file volumes/patchx-note-server/.secrets/coze-programming-test.json
```

首次创建返回 `created: true`、`status: disabled`、`callback_pending: true`。本次已实际执行；重复执行返回 `created: false`，复用原 client_id、密钥、scope 及现有回调，不会把已启用客户端重新停用。

已登记客户端若丢失交接文件，需要找回原文件/密钥；命令不会自动生成一个无法匹配旧哈希的新密钥。`--name` 可指定展示名，`--scope` 可指定已有 Agent 权限的子集；已登记的 scope 或密钥与输入不一致时会提示失败，不静默改写。

## 3. 创建插件、补录回调与启用

1. 部署包含扣子兼容和 migration `000069` 的测试服务；首次部署和迁移依当前发布流程执行。
2. 在扣子按第 1 节填表并确认，进入插件详情取得插件 ID 或实际回调 URL。
3. 将实际回调补录到同一个测试 client_id，再进行浏览器授权。

官方回调形式为 `https://www.coze.cn/api/plugin_oauth/<插件ID>/authorization_code`，插件 ID 来自扣子详情页。[回调配置说明](https://docs.coze.cn/guides_oauth_plugin)

```sh
GOMAXPROCS=1 ~/.local/go1.26.5/bin/go run -p 1 ./cmd/agentoauthclient bind \
  --config volumes/patchx-note-server/.config.test-deploy.yaml \
  --client-id patchxfreenote-coze-test \
  --redirect-uri 'https://www.coze.cn/api/plugin_oauth/<实际插件ID>/authorization_code'
```

上面的占位符必须替换为实际值，不能直接执行。成功返回 `status: active`、`callback_pending: false`；client_id、密钥、scope 保持不变，不需要再次修改或编译服务端代码。重复补录同一地址可直接复用。

若当前扣子页面要求先完成授权才能保存并取得 ID，记录实际页面要求后调整交接顺序；不要填入假的回调或把测试用的示例插件 ID 当成真实值。

## 4. 授权与试运行

在扣子点授权，由用户在我们的浏览器登录页完成手机号验证。服务端仅对预先登记的 `source_client=coze`、`client_type=confidential` 客户端允许省略 PKCE；客户端若提供 PKCE，仍按 S256 校验。WorkBuddy、本地客户端及其他客户端保持原有 PKCE 行为。

扣子按表单编码提交授权码和 client_secret 换 token，之后使用用户的 Bearer token 访问 `/mcp`。工具由 MCP 同步；无需照 OAuth 文档中的普通 API 示例手工添加接口。[MCP 创建与工具同步说明](https://docs.coze.cn/guides_create_a_plugin_based_on_mcp)

仅验证本次接入需要的两项调用：

- `patchxnote_get_current_user`：确认当前授权账号。
- `patchxnote_list_memories`：参数 `{"platform":"mobile","limit":5}`，确认该账号手机端记录可读。

工作流继续使用已确认的“单独授权”，每位用户授权自己的账号。授权失效时在扣子断开/重新授权；服务端保留原有 refresh_token 能力，本地数据库测试已覆盖刷新，扣子是否实际自动刷新仍以联调记录为准。

## 5. 切换生产与发布

测试接入通过后，在生产配置对应的数据库另行准备客户端与独立交接文件，并为生产插件登记其实际回调。生产 client_id/密钥应取生产准备命令的输出和交接文件；当前测试密钥不能当作生产交付。

| 字段 | 生产地址 |
| --- | --- |
| 插件 URL | `https://freenote.patch-x.cn/mcp` |
| client_url | `https://freenote.patch-x.cn/v1/agent/oauth/authorize` |
| authorization_url | `https://freenote.patch-x.cn/v1/agent/oauth/token` |
| authorization_content_type | `application/x-www-form-urlencoded` |

依次完成“创建 → 回调补录 → 授权 → 两项工具试运行 → 发布 → 上架”，分别记录测试、生产、发布和审核结果。[扣子 MCP 发布说明](https://docs.coze.cn/guides_create_a_plugin_based_on_mcp)、[插件上架说明](https://docs.coze.cn/guides_publish_plugin_to_store)

本次没有生成新渠道包、改变用户安装方式或新增业务工具。执行清单与验证记录见[计划文档](../plans/2026-09-14-coze-programming-mcp-oauth-checklist.md)。
