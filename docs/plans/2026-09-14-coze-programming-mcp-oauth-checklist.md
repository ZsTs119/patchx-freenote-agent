# 扣子编程 MCP OAuth 接入 Checklist

**日期：** 2026-09-14

**状态：** GoServer `d459b63` 已由用户部署，扣子授权、账号、记忆及结构化总结真实读取通过；原文提取的 `raw_body` 封装修复 `88c7f56` 已提交推送并完成定向验证，待用户部署后验证原文正文。生产和插件发布仍未完成。

**目标：** 服务端准备好 OAuth 后，维护者能填写扣子新建 MCP 插件，取得插件 ID、补录回调，再完成用户授权和真实工具查询。测试通过后切生产，最后发布/上架。

**分工：** Agent 负责填写指引；GoServer 负责客户端准备、回调配置和必要的 OAuth 兼容。保留当前安装、账号登录、业务工具和权限语义。

**路径约定：** 本文位于 Agent 仓库。两个部分的文件路径分别以 `patchnote-agent`、`patchxNoteGoServer` 根目录为准。

**执行约定：** 主代理串行完成工作，按实际授权进行 Git、部署和平台操作。用户已授权按本计划实施，后续明确客户端密钥可由服务端维护命令生成，不要求维护者预先准备。

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

- [x] 新增 `docs/marketplace/coze-programming-mcp.zh-CN.md`，明确与现有 Coze ZIP 的区别、填写字段和操作顺序。
- [x] 在现有维护 runbook 和上架 checklist 中增加该指南入口，不改原有安装与打包命令。
- [x] 将 GoServer 交付的实际 client_id、scope 和环境地址与指南对照，确保维护者无需猜测字段来源。

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

本轮测试环境按用户指定使用 `https://note-test.patch-x.cn` 基地址及对应端点；早期旧测试环境的准备记录保留在第 5 节。指南列出当前测试与生产地址，但不保存真实密钥或 token。

- [x] 说明 client_id 和插件 ID 的区别，client_url 与 authorization_url 的不同用途，以及截图中的 JSON 默认值需要改为表单编码。
- [x] 说明从插件详情取得固定回调地址，补录后再授权；提醒测试与生产使用各自客户端和配置。
- [x] 说明“创建 → 授权 → 工具试运行 → 发布 → 上架”的取用步骤。

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
| 准备客户端 | 环境、客户端身份、现有权限范围和本机私密交接文件路径。 | 首次自动生成客户端密钥并保存到私密交接文件，登记 confidential 客户端，普通输出提供不含密钥的字段清单。 |
| 补录并启用 | 原 client_id、实际固定回调地址。 | 更新并启用同一个客户端，client_id、密钥及已确认 scope 不变。 |

按用户执行中确认，密钥由服务端维护命令自动生成，数据库复用现有哈希存储；原值只写入本机权限受限的交接文件，由维护者直接复制到扣子后台，不进入聊天、普通输出或 Git。重复操作从原交接文件复用同一密钥；已登记客户端丢失交接文件时报告需要找回原密钥，不自动轮换。首期不另做发密钥页面或密钥分发服务。

- [x] 核对现有 `client_type`、`source_client`、`status` 与回调字段，复用它们识别扣子和表示待配置状态；无需新增“待审核”等状态。
- [x] 实现准备客户端和补录回调；初始可复用 disabled，按实际约束支持回调待填，避免填写假地址。
- [x] 提供实际 client_id、scope、MCP/授权/token URL 清单；重复操作不重复创建或自动轮换密钥。
- [x] 补录使用扣子给出的固定回调地址，例如 `https://www.coze.cn/api/plugin_oauth/<插件ID>/authorization_code`，保留两阶段交接结果。

### G2. standard OAuth 的最小兼容

- [x] 复用 `/v1/agent/oauth/authorize`、`token`、既有浏览器登录与 `/mcp`，保留现有用户登录过程。
- [x] 让已登记的扣子 confidential 客户端能够走文档展示的授权码加 client_secret 流程，包括省略 PKCE 的请求。兼容判断首先使用既有客户端类型/来源，只有确实不够表达才增加一个字段。
- [x] 现有 PKCE 客户端保持原行为；新客户端如携带 PKCE，复用原 S256/verifier 校验。不要抽象出规则引擎或一套可配置的鉴权平台。
- [x] 将所需变化贯穿 HTTP、service、repository；如需存储无 PKCE 授权码，再新增最小 migration，不修改历史 migration。
- [x] 优先通过扣子表单编码配置对齐现有 token 接口。实际请求字段不一致时再做对应兼容，不提前增加 JSON、Basic 或其他未需要的认证模式。
- [x] 沿用密钥、客户端/回调/用户绑定及授权码一次性使用，返回现有 token 字段；不复制账号查询或 MCP 工具实现。
- [x] 首期复用已有刷新或重新授权能力；扣子是否自动刷新作为联调记录，不新建续期服务、不要求等待真实 token 长时间过期才算开发完成。

### G3. 预计改动位置

| 位置 | 按需改动 |
| --- | --- |
| `internal/agentoauth/service.go`、`http.go` | 新客户端的授权/换码兼容。 |
| `internal/agentoauth/repository.go`、`domain.go`、`client_management.go` | 两阶段登记与必要授权码表示。 |
| `internal/agentoauth/authorize_page.go` | 只有页面的 PKCE 参数处理确实受影响时修改。 |
| `migrations/<新编号>_coze_agent_oauth_compat.{up,down}.sql` | 只新增本功能实际需要的约束/存储变化。 |
| `cmd/agentoauthclient/` | 无合适维护入口时才新增。 |
| 现有 `http_test.go`、`service_test.go`、`repository_integration_test.go` | 补充 `TestCoze...` 用例，不新增独立测试模块或脚本。 |
| 现有 Agent 接入说明与相关契约 | 只同步此次实际变更，不扩大成全仓文档重整。 |
| `scripts/release/check-m3-rollback-compat.sh` | 执行中发现的必要接点：识别新增 migration 000069，避免误入历史硬件检查；仅用既有夹具做本增量定向验证。 |

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

实际测试时 `PATCHNOTE_SMOKE_CONFIG` 必须是绝对路径，因为 Go 用例在 package 目录内运行。

有数据库改动时，将对应新增用例命名为 `TestCozeRepository...`，复用现有 `PATCHNOTE_SMOKE_CONFIG` 和隔离数据库 helper，仅执行这些数据库用例：

```sh
GOMAXPROCS=1 go test -p 1 -parallel 1 -tags=integration ./internal/agentoauth -run '^TestCozeRepository'
```

若新增维护命令且它包含独立逻辑，再定向测试该命令的新用例。要确认实际选中了测试；“没有匹配用例”或缺配置导致 skip 不能记为通过。不运行全仓、整包旧 OAuth、全部 WorkBuddy、npm、App/PC、负载、攻防或安全扫描测试。

### G5. 一次真实接入闭环

- [x] 主体实现和上述限定用例通过后，在获授权的测试环境部署，给维护者填写资料。用户已部署 `note-test.patch-x.cn`，资料已按此新测试环境重配。
- [x] 维护者创建扣子 MCP 插件并取得 ID/实际回调；服务端补录并启用同一客户端。实际插件 ID `7685350351754543144`，客户端 `patchxfreenote-coze-note-test`。
- [x] 在扣子完成一次浏览器授权，核对必要请求字段和格式，确认换 token 与工具同步成功。部署 `e26743c` 后 Chrome 实际同步成功，后续请求已进入通过认证的工具调用处理。
- [x] 调用 `patchxnote_get_current_user` 与 `patchxnote_list_memories`（`{"platform":"mobile","limit":5}`），确认对应当前授权账号。部署 `d459b63` 后通过 Chrome 实际试运行，返回有效账号和 5 条手机端记录。
- [ ] 说明授权失效后的现有重连方式；如扣子实际使用 refresh_token，则只核对该实际链路。
- [ ] 测试通过后使用生产客户端/地址/实际回调完成必要接入检查，再按授权发布和上架。

不把“所有历史工具都重测”加入验收。一次真实授权和账号/记录查询就是本次新链路的核心验证；工作流保持单独授权，记录真实使用结果即可。

部署复用执行时的当前发布流程，本计划不额外增加全量测试要求。若实际入口包含其他内置检查，按当时实现记录执行结果，不手动重复已有检查；不将旧版本发布流程的假设固化为本任务前置条件。代码、部署、真实接入和市场上架分别记录。

## 4. 完成条件

- [x] **可填写表单：** 主体实现、客户端准备和新增逻辑验证完成，维护者已能取得全部字段。
- [x] **回调可补录：** 创建扣子插件后，用配置操作登记真实回调，无需再次改代码或重新生成密钥。
- [x] **基础接入已闭环：** 扣子授权、换 token、MCP 发现与账号/记录查询通过。
- [ ] **原文读取扩展：** 用户后续要求核对原文/总结工具；总结正文已通过，原文提取修复需部署后再做真实正文验证。
- [x] **发布状态明确：** 测试/生产接入及发布/上架状态按实际结果说明，不相互代替。

如果尚无插件 ID，可记录“主体完成，等待回调补录和平台联调”，保留已完成工作。准备实现时先检查本计划涉及的文件，不因缺少插件 ID 扩大前置开发范围。

## 5. 实施与验证记录（2026-09-14）

本轮基于 Agent `1f5f6a1` 与 GoServer `c7332b6` 实施。主代理串行完成；原有 Agent 未跟踪文件保留。用户在实施中确认密钥由服务端生成，已同步替换原计划中的“维护者预先提供密钥”。

### 已完成主体

- Agent 新增 `docs/marketplace/coze-programming-mcp.zh-CN.md` 并在维护 runbook、上架 checklist 增加入口；没有修改 Agent Go/Node 运行时、渠道生成器或重新打包。
- GoServer 新增 `cmd/agentoauthclient prepare|bind` 和同一 OAuth 模块内的两阶段维护方法。首次生成随机 client_secret 到指定 `0600` 私密文件，数据库只保存哈希；重复准备复用原凭据，补录仅更新回调和 active 状态。
- 实际测试客户端已在 `.config.test-deploy.yaml` 对应数据库创建：`client_id=patchxfreenote-coze-test`、`status=disabled`、回调为空。真实 prepare 重复执行返回 `created=false`，没有轮换密钥或覆盖已配置内容。
- 私密交接文件为 GoServer `volumes/patchx-note-server/.secrets/coze-programming-test.json`，已核对权限 `600` 且被 Git 忽略。资料表中的端点与实际命令输出一致，scope 为当前 10 项既有 Agent 权限；文档与输出不包含密钥原值。
- 仅预配的 Coze confidential 客户端可省略 PKCE；显式 PKCE 继续按 S256 校验。既有浏览器页只传递查询参数，无需改动；HTTP、service 与 repository 已贯通。
- 新增 migration `000069_coze_agent_oauth_compat` 表示无 PKCE 授权码，未修改历史 migration。空回调数组已由原字段/约束容纳，初始使用既有 disabled，无新状态或策略字段。
- 回退 migration 只移除旧版本无法使用的无 PKCE 授权码，保留客户端、连接会话、token 与 S256 授权码；回退后 Coze 无 PKCE 新授权需要恢复兼容版本。
- 同步当前 OpenAPI/Apifox 的协议说明与 shared 指南，operation 数仍为 246；没有新增公开注册/API 工具或扩大 WorkBuddy DCR。

### 限定验证结果

| 范围 | 实际验证 | 结果 |
| --- | --- | --- |
| OAuth HTTP/service | `./internal/agentoauth -run TestCoze`，3 个顶层用例；无 PKCE/带 PKCE、错误密钥与回调、一次性用码、MCP principal 绑定、旧客户端仍需 PKCE。 | PASS；有效 RED 为浏览器授权 400 和无 PKCE invalid request，修复后 GREEN。 |
| 维护命令 | `./cmd/agentoauthclient -run TestCoze`，2 个顶层用例；私密交接文件、字段清单、重复复用、启用、数据库错误退出码、丢失原文件不自动换密钥。 | PASS。 |
| 实际隔离数据库 | `-tags=integration ./internal/agentoauth -run TestCozeRepository`，1 个顶层用例；两阶段登记、无/有 PKCE 授权码读写、换 token、绑定当前账号、刷新、回滚/重新应用迁移。 | PASS，未 skip；使用既有数据库 helper，结束调用既有清理流程。 |
| 必要发布接点 | 复用现有回滚夹具，在内存中改为仅测 000069；覆盖新迁移、同 revision 和未知迁移。 | 3 项 PASS；历史 Go 命令为 stub，没有执行硬件/其他业务测试；不代表真实部署通过。 |
| 契约/文档/迁移清单 | `openapi-check`、`apifox-bundle`、`docs-check`、`migration-check`。 | PASS；138 个 migration 文件清单一致。 |

所有 Go 命令均使用本机 Go 1.26.5、`GOMAXPROCS=1 -p 1 -parallel 1`，只选择上述 `TestCoze` 用例。首次数据库命令用了相对配置路径而失败，改为 `/home/zsts_119/patchxNoteGoServer/volumes/patchx-note-server/.config.smoke.yaml` 后通过；该路径错误不作为有效 RED 或成功证据。没有运行整包旧 OAuth、全仓、npm、Agent 运行时、App/PC、负载或攻防测试，也没有新增独立测试脚本。

### 待完成的平台步骤

以下最初交接状态已由第 6–8 节实际联调记录更新；G5 仅将已有实际证据的步骤勾选，原文正文验证、生产和上架继续待完成。

用户随后已授权本批两仓改动先提交并普通推送，本轮不部署；提交结果以 Git 记录和远端分支 SHA 核验为准。后续取得部署授权后，部署到本计划测试环境，再由维护者创建扣子 MCP 插件；拿到实际回调后执行 bind，用户在浏览器完成授权，再核对当前账号与最近 5 条手机端记录。主体、自审和本地测试通过，不等同于扣子真实接入闭环通过。

## 6. 新测试域名的实际授权与 MCP 版本修复（2026-09-14）

用户将本轮扣子测试目标明确改为 `https://note-test.patch-x.cn`，并告知已部署服务器。使用 `.config.note-test.yaml` 单独准备 `patchxfreenote-coze-note-test`，私密交接文件为 `coze-programming-note-test.json`；旧测试域名的客户端保留，当前指南已切换到用户指定的新测试环境。

Chrome 实际创建的插件 ID 为 `7685350351754543144`。已通过既有维护命令补录并启用：

```text
https://www.coze.cn/api/plugin_oauth/7685350351754543144/authorization_code
```

实际 OAuth 请求的 client_id 与回调完全匹配，未携带 PKCE。用户在浏览器完成验证码登录后，扣子插件详情明确显示“已授权”，授权步骤通过；没有读取或输出验证码、用户 token 或密钥原值。

工具同步仍报 `Prompts=unsupported protocol version: "2026-07-28"`，页面“暂无工具”。只读取新测试库中 Coze initialize 请求的协议版本统计，确认 3 次请求均为 `2025-06-18`；独立无鉴权初始化探测也确认，请求该版本时服务器却返回 `2026-07-28`。根因是 `internal/remotemcp/jsonrpc.go` 中错误的固定协议声明，与已通过的 OAuth 无关。

- [x] 补充 `TestCozeMCPProtocolAndToolDiscovery`，有效 RED 为返回 `2026-07-28`。
- [x] 仅把服务端声明改为实现支持的 `2025-06-18`；保持单一支持版本，其他请求版本返回这个支持版本，不直接回显任意客户端字符串。符合 [MCP 初始化/版本协商规范](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)。
- [x] `GOMAXPROCS=1 go test -p 1 -parallel 1 ./internal/remotemcp -run TestCozeMCPProtocolAndToolDiscovery -count=1 -v` PASS；仅验证本次初始化、支持版本回退和带版本 Header 的工具发现，未重跑旧业务测试。
- [x] 将协议声明修复提交并普通推送。GoServer `e26743c8f79260beaa174ed856d0b29e952f1398` 已推送到 `codex/backend-implementation`，本地 HEAD、origin 引用和远端分支 SHA 一致；提交后的上述定向用例通过，服务端工作区干净。
- [x] 用户将该提交部署到新测试服，然后在现有扣子插件点击“更新”重新同步工具。用户提供 `note_test_deployment=PASS`；Chrome 实际工具同步成功。
- [x] 工具同步成功后，试运行当前账号和最近 5 条手机端记录，确认基础接入闭环；`d459b63` 部署后通过。原文正文扩展见第 8 节。

本次协议版本修复已按用户授权提交推送，并由用户部署；实际工具调用发现的后续问题见第 7 节。主代理自审确认：协议声明与目标客户端匹配，新增测试独立断言协议版本，不复用实现常量作为预期值，未改 OAuth 或业务工具。Agent 本次仅同步指南与计划，已核对域名、客户端、真实回调和剩余验收步骤，无运行时代码改动，无需 Agent 运行时测试。没有创建重复插件、修改账号授权范围、跳过授权或发布到商店。

## 7. tools/call 元数据兼容与工具目录核对（2026-09-14）

部署依据为用户提供的 `deployment_gate=PASS`、`note_test_deployment=PASS`，run_id 为 `20260914T115829Z-95457`，revision 为 `e26743c8f79260beaa174ed856d0b29e952f1398`。随后主代理通过 Chrome 实测：已有授权有效，工具列表同步成功；账号与手机端记忆查询均在 HTTP 200 内返回 JSON-RPC `-32602 / tools/call params are invalid`，尚未执行到业务查询。

只读查询本次 Coze 请求的字段名、类型、HTTP/RPC 状态，确认两次请求均携带 `params._meta: {}`。该字段属于 [MCP 标准元数据](https://modelcontextprotocol.io/specification/2025-06-18/basic/index#meta)，现有 `callToolParams` 漏接此字段，而解码器拒绝未知字段，导致失败。

- [x] 在现有 `handler_test.go` 补充 `TestCozeToolCallMetadata`。只覆盖账号和 `platform=mobile, limit=5` 记忆查询，各验证无元数据、空元数据和带进度/扩展元数据；有效 RED 为带 `_meta` 的 4 个子用例返回 `-32602`，不带的 2 个对照通过。
- [x] 在 `callToolParams` 接收可选 `_meta` 对象；不将其传给业务参数，不修改 OAuth、业务查询或工具目录。
- [x] `GOMAXPROCS=1 go test -p 1 -parallel 1 ./internal/remotemcp -run TestCoze -count=1 -v` PASS：2 个顶层用例，覆盖既有初始化/发现与本次 6 个调用子用例。只使用合成 fixture，不运行全仓、数据库、App/PC 或其他渠道测试。
- [x] Chrome 实际核对当前插件中的原文、总结记录和模型结果工具：`patchxnote_list_memories`、`patchxnote_search_memories`、`patchxnote_list_model_io_traces`、`patchxnote_get_model_io_source_text`、`patchxnote_get_model_io_parsed_result`、`patchxnote_get_model_io_packaged_result` 均存在；使用方法与数据来源已补入接入指南。
- [x] 提交并普通推送此增量。GoServer `d459b63fe44d4b509c52323b5ebfd97e6082149f` 已推送到 `codex/backend-implementation`，本地 HEAD、origin 引用及远端分支 SHA 一致；提交后的干净工作区再次执行上述 `-run TestCoze` 定向用例，全部通过。
- [x] 用户部署 `d459b63`，再在原插件重试当前账号和手机端记忆查询。部署 run `20260914T123922Z-44517` 由用户提供 PASS，Chrome 两项真实调用通过；工具列表已同步，无需重复创建插件。

主代理自审通过，本次 `_meta` 修复已提交推送并由用户部署，账号/记录调用已通过。随后原文和总结的实际验证与原文提取跟进见第 8 节。原文来自服务端模型请求中的文本投影，不能据此承诺可读取所有 App 本地完整转写；保留 availability/field_status 的实际数据状态。

## 8. 真实内容读取与通用原文提取修复（2026-09-14）

部署 `d459b63` 后，主代理在同一扣子插件实际点击运行并解析响应结构，不以工具列表默认的“通过”标签代替调用证据：

| 工具 | 实测结果 |
| --- | --- |
| `patchxnote_get_current_user` | PASS，返回有效账号，status=active。 |
| `patchxnote_list_memories` | PASS，mobile/limit=5，返回 5 条记录，包含 structured_result 和 model_io_trace。 |
| `patchxnote_get_model_io_packaged_result` | PASS，event_summary 对应结果 available，返回 1458 字节且未截断，request_id 与所选记录匹配。 |
| `patchxnote_list_model_io_traces` | PASS，mobile/completed/limit=5，返回 5 条已完成记录。 |
| `patchxnote_get_model_io_source_text` | 请求 PASS，所选转写记录返回 not_recorded；原文正文验收尚未通过。 |

随后只读检查本次使用的两条 9 月 10 日样本，确认原文仍存在于 `client_request_json.raw_body.payload.segments[].text`，分别有 54/55 字符的非空片段，请求未标记截断。`not_recorded` 在此处是原文提取器遗漏封装层的结果，不能推断为日期过期或数据库没有原文。没有输出或保存样本正文、账号私密字段和凭据。

- [x] 在 GoServer `collectAgentSourceSegments` 的既有遍历入口中加入 `raw_body`；保留原 segments/public_segments、payload、event_revisions、events、items 格式，仍不提取 provider_body 或用户指令。
- [x] 在既有 `internal/agentaccess/service_test.go` 加入两个 `TestAgentSourceTextRawBody...` 定向用例，合成 fixture 复现有效 RED，再验证 GREEN。覆盖旧格式、新封装、原文不重复、缺失/截断状态，及按 memory/request 读取、原文可用状态、Markdown 原文章节和总结结果保持不变。
- [x] `GOMAXPROCS=1 go test -p 1 -parallel 1 ./internal/agentaccess -run TestAgentSourceTextRawBody -count=1 -v` PASS；提交后在干净工作区复核同一范围通过。未跑无关模块或新增独立测试脚本。
- [x] GoServer `88c7f569d10e7abe74929e3f78df679967109054` 已普通推送到 `codex/backend-implementation`；本地 HEAD、origin 引用及远端分支 SHA 一致。
- [ ] 用户部署 `88c7f56` 后，用本次已有记录在扣子重新运行原文工具，确认 availability=available、正文非空且记录对应。

这是 Agent API、CLI、本地 MCP 和远程 MCP 共用的原文读取修复，不是 Coze 专用分支。没有修改数据存储、OAuth、工具参数、模型执行或总结生成，无需重录这两条样本或重跑模型。只有连接到更新环境的客户端会看到修正后的原文及其可用状态，生产环境不会随测试部署改变。主代理自审通过；原文在线正文验证仍待部署，插件发布与生产接入未执行。
