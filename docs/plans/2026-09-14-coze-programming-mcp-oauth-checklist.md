# 扣子编程 MCP OAuth 接入 Checklist

**日期：** 2026-09-14

**状态：** 已完成功能优先的计划自审与收敛，待实施；本次仅优化文档。

**目标：** 服务端准备好 OAuth 后，维护者能填写扣子新建 MCP 插件，取得插件 ID、补录回调，再完成用户授权和真实工具查询。测试通过后切生产，最后发布/上架。

**分工：** Agent 负责填写指引；GoServer 负责客户端准备、回调配置和必要的 OAuth 兼容。保留当前安装、账号登录、业务工具和权限语义。

**路径约定：** 本文位于 Agent 仓库。两个部分的文件路径分别以 `patchnote-agent`、`patchxNoteGoServer` 根目录为准。

**执行约定：** 主代理串行完成工作，按实际授权进行 Git、部署和平台操作。本次只修改计划，不实施代码或创建凭据。

## 1. 自审后的调整

| 原计划的问题 | 本次收敛 |
| --- | --- |
| 为一张后台填写表单新增资料渠道、manifest、模板和生成器分支。 | Agent 首期只写一份接入指南，并给现有文档加入口；暂不新增 `coze-programming` 生成模块。 |
| “客户端策略”可能扩大成通用 OAuth 配置或管理功能。 | 用现有客户端类型、来源和状态做最小兼容判断；只有现有字段无法表达时才补一个必要字段。 |
| 要求运行整个 `internal/agentoauth` 测试包。 | 本次新增用例统一以 `TestCoze` 开头，命令只选择这些用例；兼容断言放在新增用例内，不重跑旧渠道整套测试。 |
| 客户端准备和资料交付只有概念，没有明确回填来源。 | 写清两次维护操作的输入/结果，分开提供非敏感字段清单与客户端密钥。 |
| “PKCE 等实际请求确认”可能变成开发前的阻塞项。 | 主体按文档的 standard 授权码流程准备；真实请求用于联调核对，发现差异再局部调整。 |
| 自动续期与平台最终审核容易扩展首期范围。 | 复用现有刷新/重新授权能力，先打通一次完整授权和查询；不新增续期机制，平台上架状态另记。 |

OAuth 必需的密钥校验、回调匹配、授权码一次性使用和账号对应关系继续沿用。它们是“给正确用户发正确 token”的功能要求。本次不另加管理后台、审批状态机、通用策略引擎、安全扫描器、审计报告或专项攻防测试。

## 2. 已对齐的范围与事实

- [x] 使用扣子编程“资源库 → 新建插件 → MCP → OAuth standard”入口。
- [x] 现有 `coze` ZIP 属于另一个“扩展 → 插件”入口，原实现和产物保留。
- [x] OAuth client_id 由 GoServer 侧先准备；扣子插件 ID 在插件创建后生成。
- [x] 客户端准备和回调补录分两次完成，补录无需再次修改代码。
- [x] 复用既有授权、token、连接会话和 `/mcp`，不新增一套专用 OAuth 服务。
- [x] 每位用户授权自己的 PatchXNote 账号，扣子工作流使用默认“单独授权”。
- [x] 先测试环境联调，再切生产；测试只覆盖本次新增逻辑。

官方依据：[MCP 插件创建](https://docs.coze.cn/guides_create_a_plugin_based_on_mcp)、[OAuth 配置](https://docs.coze.cn/guides_oauth_plugin)、[插件上架](https://docs.coze.cn/guides_publish_plugin_to_store)、[单独/共享授权模式](https://docs.coze.cn/guides_plugin_node)。

OAuth 文档用“调用扣子 API”举例，我们的服务提供方应替换为 PatchXNote GoServer。工具通过 MCP 同步，不新增手工 API 工具，也不需要把原 ZIP 上传到这个创建页面。

已有代码可复用 confidential 客户端、密钥哈希、授权码和 token。HTTP、service、repository 与授权码表当前都要求 PKCE；公开动态注册针对 WorkBuddy。这是本次需适配的实际范围。

原计划记录的 Agent 合并基线为 `e7e6975`，GoServer 基线为 `8300a7d`；实施前刷新分支和工作区，保留已有未提交内容。

## 3. 两阶段交接

| 阶段 | 操作 | 交付结果 |
| --- | --- | --- |
| 服务端准备 | 完成主体实现、相关用例和测试部署；准备客户端。 | client_id、客户端密钥及可填写的接口/scope 清单，回调待配置。 |
| 扣子创建 | 维护者按清单填写页面并确认。 | 扣子插件 ID 或实际固定回调地址。 |
| 回调补录 | 服务端把地址登记到原客户端并启用。 | client_id 和密钥保持原值，不重新编译代码。 |
| 真实联调 | 用户在扣子完成授权，调用现有 MCP 工具。 | 当前账号和记录查询成功，后续重连方式明确。 |
| 正式发布 | 配置生产客户端/地址/回调并验证，再发布和上架。 | 如实记录生产接入与平台发布状态。 |

没有插件 ID 不妨碍先完成主体开发。第一次扣子联调要确认“保存插件并取得 ID”能在回调待配置时完成；若平台要求不同顺序，再根据实际页面结果调整配置步骤，不预先开发额外绕行流程。

---

## 第一部分：Agent

### A1. 首期交付

Agent 只补维护资料，不改运行时或渠道生成器。将来确有多平台重复生成需求，再把资料纳入统一入口。

- [ ] 新增 `docs/marketplace/coze-programming-mcp.zh-CN.md`，明确与现有 Coze ZIP 的区别、填写字段和操作顺序。
- [ ] 在现有维护 runbook 和上架 checklist 中增加该指南入口，不改原有安装与打包命令。
- [ ] 将 GoServer 交付的实际 client_id、scope 和环境地址与指南对照，确保维护者无需猜测字段来源。

### A2. 填表清单

| 扣子字段 | 生产填写规则 |
| --- | --- |
| 类型 / 授权方式 | `MCP` / `OAuth → standard` |
| 插件 URL | `https://freenote.patch-x.cn/mcp` |
| client_id | GoServer 维护侧提供的实际值。 |
| client_secret | 对应密钥，在扣子后台填写；不写进公共指南或上架材料。 |
| client_url | `https://freenote.patch-x.cn/v1/agent/oauth/authorize` |
| scope | GoServer 为该客户端登记的现有 scope，空格分隔。 |
| authorization_url | `https://freenote.patch-x.cn/v1/agent/oauth/token` |
| authorization_content_type | `application/x-www-form-urlencoded` |
| Header 列表 | 保留适用默认值；用户 token 由扣子携带。 |

测试环境使用既有 `https://ws-lab.patch-x.cn/patchnote-test-api` 基地址及对应端点。指南同时列出两套地址，但不保存真实密钥或 token。

- [ ] 说明 client_id 和插件 ID 的区别，client_url 与 authorization_url 的不同用途，以及截图中的 JSON 默认值需要改为表单编码。
- [ ] 说明从插件详情取得固定回调地址，补录后再授权；提醒测试与生产使用各自客户端和配置。
- [ ] 说明“创建 → 授权 → 工具试运行 → 发布 → 上架”的取用步骤。

### A3. 文件与验证

涉及文件仅为：

- 新增：`docs/marketplace/coze-programming-mcp.zh-CN.md`。
- 更新入口：`docs/release-and-maintenance-runbook.zh-CN.md`、`docs/marketplace/publishing-checklist.zh-CN.md`。

只核对填写清单、当前服务端实际地址、文档链接和字段含义，执行文档差异检查即可。**不生成新渠道产物、不新增模板/manifest/测试文件，不运行 Node、npm 或 Agent Go 运行时测试。**

**Agent 完成条件：** 有一份能直接指导维护者回填表单的指南，client_id/密钥/scope 的取值来自服务端实际准备结果。

---

## 第二部分：GoServer

### G1. 维护能力：仅两次操作

优先复用适用的维护入口；确无入口时，增加一个小型 `cmd/agentoauthclient/` 命令，仅处理准备客户端与补录回调。

| 操作 | 输入 | 结果 |
| --- | --- | --- |
| 准备客户端 | 环境、客户端身份、现有权限范围和维护者提供的客户端密钥。 | 登记 confidential 客户端，输出不含密钥的字段清单。 |
| 补录并启用 | 原 client_id、实际固定回调地址。 | 更新并启用同一个客户端，client_id、密钥及已确认 scope 不变。 |

密钥由维护者通过已有私密配置或无回显输入传入，服务端复用现有哈希存储；同一密钥由维护者直接回填扣子。首期不另做发密钥页面或密钥分发服务。

- [ ] 核对现有 `client_type`、`source_client`、`status` 与回调字段，复用它们识别扣子和表示待配置状态；无需新增“待审核”等状态。
- [ ] 实现准备客户端和补录回调；初始可复用 disabled，按实际约束支持回调待填，避免填写假地址。
- [ ] 提供实际 client_id、scope、MCP/授权/token URL 清单；重复操作不重复创建或自动轮换密钥。
- [ ] 补录使用扣子给出的固定回调地址，例如 `https://www.coze.cn/api/plugin_oauth/<插件ID>/authorization_code`，保留两阶段交接结果。

### G2. standard OAuth 的最小兼容

- [ ] 复用 `/v1/agent/oauth/authorize`、`token`、既有浏览器登录与 `/mcp`，保留现有用户登录过程。
- [ ] 让已登记的扣子 confidential 客户端能够走文档展示的授权码加 client_secret 流程，包括省略 PKCE 的请求。兼容判断首先使用既有客户端类型/来源，只有确实不够表达才增加一个字段。
- [ ] 现有 PKCE 客户端保持原行为；新客户端如携带 PKCE，复用原 S256/verifier 校验。不要抽象出规则引擎或一套可配置的鉴权平台。
- [ ] 将所需变化贯穿 HTTP、service、repository；如需存储无 PKCE 授权码，再新增最小 migration，不修改历史 migration。
- [ ] 优先通过扣子表单编码配置对齐现有 token 接口。实际请求字段不一致时再做对应兼容，不提前增加 JSON、Basic 或其他未需要的认证模式。
- [ ] 沿用密钥、客户端/回调/用户绑定及授权码一次性使用，返回现有 token 字段；不复制账号查询或 MCP 工具实现。
- [ ] 首期复用已有刷新或重新授权能力；扣子是否自动刷新作为联调记录，不新建续期服务、不要求等待真实 token 长时间过期才算开发完成。

### G3. 预计改动位置

| 位置 | 按需改动 |
| --- | --- |
| `internal/agentoauth/service.go`、`http.go` | 新客户端的授权/换码兼容。 |
| `internal/agentoauth/repository.go`、`domain.go` | 两阶段登记与必要授权码表示。 |
| `internal/agentoauth/authorize_page.go` | 只有页面的 PKCE 参数处理确实受影响时修改。 |
| `migrations/<新编号>_coze_agent_oauth_compat.{up,down}.sql` | 只新增本功能实际需要的约束/存储变化。 |
| `cmd/agentoauthclient/` | 无合适维护入口时才新增。 |
| 现有 `http_test.go`、`service_test.go`、`repository_integration_test.go` | 补充 `TestCoze...` 用例，不新增独立测试模块或脚本。 |
| 现有 Agent 接入说明与相关契约 | 只同步此次实际变更，不扩大成全仓文档重整。 |

默认不修改 `internal/remotemcp`、App/PC、硬件、额度、模型执行和 Agent 运行时。公开契约若有实际变化，再同步对应 OpenAPI/Apifox/smoke 条目。

### G4. 只测本次新增逻辑

新增用例使用 `TestCoze...` 命名前缀，放在上述现有测试文件；对未修改的旧能力不单独再跑一遍。

| 用例组 | 足够的验证范围 |
| --- | --- |
| 两阶段准备 | 准备后能取得字段清单；补录回调后可授权，重复操作不更换客户端或密钥。 |
| 新授权码流程 | 正确参数能换 token；用少量表驱动断言覆盖错误密钥、回调不匹配与重复用码。 |
| PKCE 接点 | 新兼容分支按预期处理；在同一新增用例内验证原 PKCE 分支没有被放开，携带错误 verifier 仍失败。 |
| 实际数据库，条件项 | 仅当 repository/migration 改动时，验证本次新增记录和授权码表示可读写。 |

拟议定向命令，在相应新用例写好后于 GoServer 仓库串行执行：

```sh
GOMAXPROCS=1 go test -p 1 -parallel 1 ./internal/agentoauth -run '^TestCoze'
```

有数据库改动时，将对应新增用例命名为 `TestCozeRepository...`，复用现有 `PATCHNOTE_SMOKE_CONFIG` 和隔离数据库 helper，仅执行这些数据库用例：

```sh
GOMAXPROCS=1 go test -p 1 -parallel 1 -tags=integration ./internal/agentoauth -run '^TestCozeRepository'
```

若新增维护命令且它包含独立逻辑，再定向测试该命令的新用例。要确认实际选中了测试；“没有匹配用例”或缺配置导致 skip 不能记为通过。不运行全仓、整包旧 OAuth、全部 WorkBuddy、npm、App/PC、负载、攻防或安全扫描测试。

### G5. 一次真实接入闭环

- [ ] 主体实现和上述限定用例通过后，在获授权的测试环境部署，给维护者填写资料。
- [ ] 维护者创建扣子 MCP 插件并取得 ID/实际回调；服务端补录并启用同一客户端。
- [ ] 在扣子完成一次浏览器授权，核对必要请求字段和格式，确认换 token 与工具同步成功。
- [ ] 调用 `patchxnote_get_current_user` 与 `patchxnote_list_memories`（`{"platform":"mobile","limit":5}`），确认对应当前授权账号。
- [ ] 说明授权失效后的现有重连方式；如扣子实际使用 refresh_token，则只核对该实际链路。
- [ ] 测试通过后使用生产客户端/地址/实际回调完成必要接入检查，再按授权发布和上架。

不把“所有历史工具都重测”加入验收。一次真实授权和账号/记录查询就是本次新链路的核心验证；工作流保持单独授权，记录真实使用结果即可。

部署复用执行时的当前发布流程，本计划不额外增加全量测试要求。若实际入口包含其他内置检查，按当时实现记录执行结果，不手动重复已有检查；不将旧版本发布流程的假设固化为本任务前置条件。代码、部署、真实接入和市场上架分别记录。

## 4. 完成条件

- [ ] **可填写表单：** 主体实现、客户端准备和新增逻辑验证完成，维护者已能取得全部字段。
- [ ] **回调可补录：** 创建扣子插件后，用配置操作登记真实回调，无需再次改代码或重新生成密钥。
- [ ] **功能已闭环：** 扣子授权、换 token、MCP 发现与账号/记录查询通过。
- [ ] **发布状态明确：** 测试/生产接入及发布/上架状态按实际结果说明，不相互代替。

如果尚无插件 ID，可记录“主体完成，等待回调补录和平台联调”，保留已完成工作。准备实现时先检查本计划涉及的文件，不因缺少插件 ID 扩大前置开发范围。

**本次文档交付：** 仅自审并优化这份计划，没有修改实现、创建客户端或凭据、运行 OAuth 测试、提交、部署或上架。
