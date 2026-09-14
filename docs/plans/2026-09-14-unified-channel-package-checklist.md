# PatchXNote 统一渠道上架包生成 Checklist

**日期：** 2026-09-14

**状态：** 已完成实施及限定模块验证（2026-09-14）。功能改动未提交、未推送、未上架。

**工作分支：** `codex/workbuddy-connector-package`

**目标：** 基于 `main` 现有功能，提供一个维护者使用的生成入口，通过渠道配置生成 WorkBuddy、Codex、Claude Code 的上架材料；用户继续沿用现有安装、登录和使用流程。

**实现原则：** 复用已有 Skill、manifest 和打包能力，以配置选择来源和输出格式。先完成三个渠道从配置到可交付产物的闭环，只验证本次新增或直接改动的打包模块。

**执行约定：** 主代理串行完成实施和自审。合并、提交、推送、上架按已有协作规则和实际授权执行；本次按计划执行主分支合并；功能实现和文档改动保留在工作区。

## 1. 本次自审结论

| 原计划的问题 | 调整结果 |
| --- | --- |
| 同时新增生成、独立校验、独立测试三个入口，维护成本高于当前需求。 | 只新增统一生成入口，必要检查内置或复用现有函数；不新增 `validate-channel-package.mjs` 和 `test-channel-packaging.mjs`。 |
| 要求全量 Go 测试、既有分发链路回归，与包装模块的改动范围不匹配。 | 按用户最新要求，仅验证新增生成入口及直接改动的打包函数；不运行全仓 Go 测试、npm 安装器回归、OAuth 或 MCP 业务测试。 |
| 构建报告、SHA-256、工作区审计、ZIP 损坏注入、严格配置白名单、字节级可复现等成为必做事项。 | 删除这些首期要求；成功时打印渠道、环境、版本和产物路径即可。ZIP 用现有工具打开检查，不自建完整性测试体系。 |
| 默认调整现有 Skill 同步/校验机制、迁移所有渠道目录，扩大了影响面。 | 优先读取现有公共源和 manifest，保留原有目录及同步流程；仅修改生成器必须调用的部分。 |
| 插件产物只有目录描述，未说清 marketplace 清单如何随产物交付。 | 补齐 Codex、Claude Code 的清单及相对路径布局，生成后不要求维护者再手工拼装。 |
| 环境参数与 Skill-only 包之间的关系不够具体。 | Remote MCP 包生成对应端点；Skill-only 包只调整必要的环境说明，沿用已有显式选择服务地址的方法。 |
| 强制保留旧 WorkBuddy 脚本、路径等兼容层，但没有对应使用需求。 | 先检查真实引用；没有消费者则直接统一入口并更新维护文档，有消费者才保留薄封装。 |

保留的基础要求仅服务于正确打包：参数可识别、必需文件存在、产物能读取、清理限定在本次输出目录、包内不带本地凭据。沿用已有安全处理，不新增安全扫描器、权限机制或审批流程。

## 2. 已确认范围

勾选项表示已确认的决策，不代表实现完成。

- [x] 包用于维护者向 AI 平台上架连接器或插件，不新增用户安装产品。
- [x] 首期渠道为 `workbuddy`、`codex`、`claude-code`，每个参数对应明确的平台产品。
- [x] 后续实施先同步 `main`，采用其已有生产接入更新。
- [x] 主流程、CLI、安装器、OAuth、凭据存储、MCP 工具和服务端业务保持现状。
- [x] 公共 Skill 的使用含义保持现状；渠道差异只涉及既有接入说明和包装文件。
- [x] 默认生产环境，测试环境显式选择；渠道和环境分别配置。
- [x] 保留各渠道现有标识、版本来源和包形态，不自动升级 npm 或插件版本。
- [x] 本轮交付统一入口、渠道配置、三个渠道产物和必要维护说明；测试仅覆盖本次打包模块。

Codex 与 Claude Code 当前是 Skill 插件，继续引导既有安装流程；本轮不改为自动注册 MCP 的连接器。平台提交、审核及真实账号使用属于后续上架工作，不作为本次本地生成模块完成的前置条件。

## 3. 仓库基线与现有来源

以下 Git 状态为 2026-09-14 的核对结果，实施时刷新即可。

- 当前分支 `78bab29`，`main` 为 `bf53629`；当前分支独有 1 个提交，主分支独有 5 个提交。
- `main` 已包含生产地址与 `0.2.13` 接入更新，当前 WorkBuddy 包仍绑定测试地址。
- `skills/patchxnote-mcp/` 是公共 Skill 来源；现有同步脚本维护 npm、Codex、Claude Code 的副本。
- WorkBuddy 专用内容位于 `packages/workbuddy/patchxnote-agent/`，可以作为渠道材料来源。
- Codex、Claude Code 的版本和身份分别由现有 `.codex-plugin/plugin.json`、`.claude-plugin/plugin.json` 提供。

实施前按仓库现有阅读要求了解 README、工程规则、维护 runbook、MVP 计划和服务端集成契约；本任务不另建一套契约审计。与包装直接相关的参考为：

- `docs/plans/2026-09-03-patchxnote-mcp-skill-marketplace-checklist.md`
- `docs/plans/2026-09-07-workbuddy-connector-package-checklist.md`
- `docs/mcp-local-remote-handoff.zh-CN.md`

旧 WorkBuddy 计划保留为历史背景，后续通用生成工作以本计划为准。

## 4. 首期交付的具体产物

统一输出根目录采用 `dist/channels/<channel>/<env>/<version>/`。版本从所选渠道现有 manifest 读取，文件名不能继续写死某个版本。

| 渠道 | 最终交付 | 布局和内容要求 |
| --- | --- | --- |
| `workbuddy` | `patchxnote-workbuddy-connector-<version>.zip` | ZIP 根目录直接包含 `connector-meta.json`、`mcp.json`、图标和 `skills/`；使用所选环境的 Remote MCP。 |
| `codex` | 可直接取用的 `bundle/` 目录 | 包含 `.agents/plugins/marketplace.json` 和 `packages/plugins/openai/patchxnote-agent/`，保持现有市场清单引用可解析。 |
| `claude-code` | 可直接取用的 `bundle/` 目录 | 包含 `.claude-plugin/marketplace.json` 和 `packages/plugins/claude/patchxnote-agent/`，保持现有市场清单引用可解析。 |

插件 bundle 保留当前清单所使用的目录关系：

```text
Codex bundle/
├── .agents/plugins/marketplace.json
└── packages/plugins/openai/patchxnote-agent/
    ├── .codex-plugin/plugin.json
    └── skills/patchxnote-mcp/...

Claude Code bundle/
├── .claude-plugin/marketplace.json
└── packages/plugins/claude/patchxnote-agent/
    ├── .claude-plugin/plugin.json
    └── skills/patchxnote-mcp/...
```

这里生成的是可交付的平台材料集合，具体提交时按平台要求选取对应插件目录或清单；不承诺平台接受同一种 ZIP。未核实的支持、隐私或审核资料沿用现有值或单独注明缺项，不伪造，也不因此阻塞本地打包实现。

## 5. 最小配置与文件方案

### 5.1 配置内容

首期采用一个 `packages/distribution/channels.json`，按公共来源、环境、渠道三个部分组织。只在实际维护需要出现后再拆分文件。

- 公共来源：`skills/patchxnote-mcp/`、公共资源及已有展示信息的引用。
- 环境：`production`、`test` 的 API 基地址和 MCP 端点。
- 渠道：包形态、manifest 路径、marketplace 清单路径（适用时）、资源映射及渠道说明覆盖。

| 环境 | API 基地址 | MCP 端点 |
| --- | --- | --- |
| `production`，默认 | `https://freenote.patch-x.cn` | `https://freenote.patch-x.cn/mcp` |
| `test`，显式选择 | `https://ws-lab.patch-x.cn/patchnote-test-api` | `https://ws-lab.patch-x.cn/patchnote-test-api/mcp` |

生产接入页面沿用 `https://freenote.patch-x.cn/mcp/setup/`。测试说明使用已有明确的地址选择方式，不推测新的网页路径。

公共源先复制，渠道明确列出的差异再覆盖。完全相同的 Skill 文件复用公共源；已有实质差异的接入或工作流说明保留为渠道材料，不为追求合并而改变其含义。环境变化仅作用于生成副本中的有效配置和必要说明，保证测试包不会一边标记测试、一边要求切回生产。

Codex、Claude Code 应直接读取公共 Skill 源生成产物，不能依赖维护者事先运行同步脚本。环境选择不改变用户现有配置，也不改变标准安装入口。

### 5.2 文件范围

| 文件或目录 | 动作 |
| --- | --- |
| `packages/distribution/channels.json` | 新增一个统一配置文件。 |
| `scripts/package-channel.mjs` | 新增唯一的维护者生成入口，包含少量必要检查。 |
| `scripts/package-workbuddy-connector.mjs` | 按需要复用其中 ZIP 打包能力；有实际旧入口依赖才保留薄封装。 |
| `scripts/validate-workbuddy-connector.mjs` | 如生成器复用，最小化参数化目标目录和环境，去除固定测试地址要求；不重新设计校验体系。 |
| `packages/workbuddy/patchxnote-agent/` | 复用现有 manifest、图标和渠道说明；仅调整生成器需要的环境模板/来源关系。 |
| 两个现有插件目录及 marketplace 清单 | 作为生成输入，保持仓库中的现有路径、标识和版本来源。 |
| `docs/release-and-maintenance-runbook.zh-CN.md` | 补充统一构建命令、输出位置和材料取用方式。 |
| 旧 WorkBuddy 计划及上架 checklist | 更新入口引用与接续说明，不扩写新的审核流程。 |

首期不新建通用模板引擎、独立校验入口、测试脚本、报告文件或 CI 工作流。实现时将旧脚本的 ZIP 写入代码原样迁入 `scripts/lib/package-zip.mjs` 供统一入口调用，没有新增一套打包引擎。

## 6. 实施 Checklist

### A. 同步基线

- [x] 检查并保留当前用户工作，按已授权范围同步最新 `main`。
- [x] 记录同步后的基线，确认生产地址及各渠道版本。
- [x] 后续只修改包装相关文件；主分支合并带来的历史变更与本次新增变更分别记录。

### B. 配置与内容组合

- [x] 创建统一配置，将三个渠道映射到现有 manifest、公共 Skill、资源及适用的 marketplace 清单。
- [x] 从现有 manifest 读取包标识和版本，不在配置中重复人工维护。
- [x] 复用公共 Skill，明确 WorkBuddy 必要的说明覆盖及生产/测试地址渲染方式。
- [x] 直接由源文件生成插件内容，不要求先同步 npm/插件副本，不修改现有同步流程。

### C. 生成入口与产物

- [x] 实现 `--channel <id>` 和可选 `--env production|test`，提供简短 `--help`；默认环境为生产。
- [x] 未知渠道、未知环境或缺少必需来源文件时，返回清晰错误和非零退出码。
- [x] 从脚本位置确定仓库根目录，避免依赖当前终端目录；使用现有 Node.js 运行时和文件路径 API。
- [x] 完成 WorkBuddy ZIP 以及两个插件 bundle 的生成，保持插件清单和目录的相对关系。
- [x] 生产与测试产物分目录；重建只清理本次渠道/环境/版本输出，不动其他产物和源码。
- [x] 生成必要文件后检查 manifest 可解析、必需路径存在、所选地址正确；WorkBuddy 保留平台要求的格式和大小检查。
- [x] 最终打印渠道、环境、版本及可交付路径；失败返回非零，不打印成功结论。
- [x] 核对旧脚本引用：仅有文档引用则更新命令即可；有真实调用方才增加兼容薄封装，不无条件维护第二套入口。

### D. 模块验证与维护说明

- [x] 执行下一节的限定验证，确认三个渠道都能得到可取用的产物。
- [x] 在维护 runbook 中说明生成命令、目录/ZIP 的取用方式，以及测试环境只作用于产物。
- [x] 对照同步后的基线确认未改动用户安装与业务功能，记录主代理自审结果。
- [x] 保留用户原有文件，不自动提交、推送或上架。

## 7. 只验证本次新增的打包模块

本次任务的测试范围以用户最新要求为准：覆盖新入口、配置选择、内容组合、打包输出，以及直接改动的旧打包函数。**不运行全量 Go 测试、不回归未改动的 npm 安装器、不重新执行 OAuth/MCP 业务或浏览器验收。**

不新增持久化测试脚本。直接运行入口，使用现有 JSON/解压工具读取实际产物，记录结果即可。复用已有检查时只调用与产物相关的部分，不为了复用而连带执行全仓或全部渠道历史校验。

| 必须验证的情况 | 最小操作与预期 |
| --- | --- |
| 三个生产渠道 | 各生成一次；版本来自原 manifest，产物齐全，打印路径可以实际打开。 |
| WorkBuddy 包 | 用现有解压工具打开 ZIP，检查根目录、MCP 端点和 Skill 文件；无需自建 CRC 解析器或篡改注入测试。 |
| 两个插件 bundle | 读取 marketplace 清单，其 source 能定位到生成的插件；插件 manifest 的 Skill 路径存在，公共内容来自当前源。 |
| 显式测试环境 | 三个渠道各生成一次；WorkBuddy 切换端点，Skill-only 包的相关说明与所选环境一致；生产产物保留。 |
| 无效输入 | 分别使用一个未知渠道、一个未知环境，确认报错且不会生成成功产物。 |
| 直接修改的旧入口 | 仅在确实保留并修改薄封装时运行一次，确认委托到统一逻辑；其他旧模块不重测。 |

以下入口已实现，并已逐条串行执行验证：

```sh
node scripts/package-channel.mjs --help
node scripts/package-channel.mjs --channel workbuddy
node scripts/package-channel.mjs --channel codex
node scripts/package-channel.mjs --channel claude-code
node scripts/package-channel.mjs --channel workbuddy --env test
node scripts/package-channel.mjs --channel codex --env test
node scripts/package-channel.mjs --channel claude-code --env test
```

负向验证，预期返回非零退出码：

```sh
node scripts/package-channel.mjs --channel unknown
node scripts/package-channel.mjs --channel workbuddy --env unknown
```

记录命令结果、产物路径和发现的问题即可。只在本次模块验证发现问题后修改并复测相关项，不追加全局回归、安全攻防、校验和、时间戳一致性或跨平台环境矩阵。

以下实施记录给出已完成的模块验证结果。

## 8. 完成条件

- [x] 同一生成入口能够按配置生成三个渠道的上架材料。
- [x] WorkBuddy ZIP 可打开；两个插件 bundle 的 marketplace 清单能解析到包内插件目录，取用时无需重新手工拼装。
- [x] 默认生产与显式测试均正确，版本与既有渠道来源一致。
- [x] 公共内容直接取自源文件，渠道差异有明确配置，用户安装和主流程功能保持原样。
- [x] 本次打包模块的限定验证通过；实际问题与未验证项如实记录。
- [x] 维护文档提供可执行命令及实际输出位置。
- [x] 本地生成交付完成与平台提交/审核状态分别说明；本次不以上架验收作为完成门槛。

本计划已收敛到“统一入口生成可用渠道产物”的功能闭环。后续增加渠道或遇到平台新的格式要求，再针对实际需求补充适配。


## 9. 实施与验证记录（2026-09-14）

以下第 9、10 节保留首次生成时的名称、字节数与内容比对记录。第 11 节记录首次展示更名；WorkBuddy 随后按第 12 节切换为新连接器身份，当前 WorkBuddy 取用以第 12 节为准，其他渠道沿用第 11 节。

### 基线与实现

- 已将 `main` 的 `bf53629` 合入工作分支，合并提交为 `e7e6975`，父提交为 `78bab29` 和 `bf53629`；无冲突。
- 新入口：`scripts/package-channel.mjs`；统一配置：`packages/distribution/channels.json`。
- 测试插件使用一个小型环境接入 reference：`packages/distribution/test-onboarding.md`，仅影响生成副本。
- WorkBuddy 校验函数已支持生成目录、环境端点及 ZIP 路径参数，复用原有检查。
- 旧 WorkBuddy 打包入口没有实际调用方，已移除；ZIP 写入代码迁入 `scripts/lib/package-zip.mjs`。历史计划注明旧命令已被替代，已有旧产物未被清理。
- 生产插件的六个公共 Skill 文件逐文件与源内容一致。测试插件仅三个文件不同：`SKILL.md`、`references/onboarding.md`、`references/source-of-truth.md`。
- 对照合并后的 `e7e6975`，`cmd/`、`internal/`、`packages/npm/`、公共 `skills/`、`.github/`、原有插件目录及 marketplace 清单均无改动。

### 实际产物

所有路径相对于仓库根目录，测试产物未覆盖生产产物。

| 渠道 | 环境 | 产物 | 结果 |
| --- | --- | --- | --- |
| WorkBuddy | production | `dist/channels/workbuddy/production/0.1.0/patchxnote-workbuddy-connector-0.1.0.zip` | 通过，19,770 字节，9 个文件。 |
| WorkBuddy | test | `dist/channels/workbuddy/test/0.1.0/patchxnote-workbuddy-connector-0.1.0.zip` | 通过，19,820 字节，9 个文件。 |
| Codex | production | `dist/channels/codex/production/0.1.1/bundle/` | 通过，marketplace 相对引用有效，公共 Skill 与源一致。 |
| Codex | test | `dist/channels/codex/test/0.1.1/bundle/` | 通过，测试环境说明与已有服务地址参数正确。 |
| Claude Code | production | `dist/channels/claude-code/production/0.1.1/bundle/` | 通过，marketplace 相对引用有效，公共 Skill 与源一致。 |
| Claude Code | test | `dist/channels/claude-code/test/0.1.1/bundle/` | 通过，另从仓库外工作目录调用，产物仍写入仓库的正确位置。 |

### 限定验证

- 生成环境：Windows Node.js `v22.18.0`，通过仓库 UNC 路径运行；未声称其他操作系统均已验证。
- 新入口语法、`--help`、三个生产构建、三个显式测试构建均返回 0。
- `--channel unknown` 与 `--env unknown` 均返回 1，并且未创建对应输出目录。
- 用 Python 标准库读取两份 ZIP，正常解包，核对 9 个条目、根目录、JSON 中的端点和实际文件内容。
- 读取四份插件 bundle，marketplace 的 source 均能定位到生成的插件，manifest 标识/版本保持原值。
- 六份 Skill 的本地相对链接均可解析，产物中无未渲染的模板占位符。
- `git diff --check`、新增文件空白检查通过；未新增测试脚本、独立校验入口、构建审计报告或 CI。
- 未执行全量 Go、npm 安装器、OAuth、MCP 业务或浏览器测试，符合本任务约定。

### 自审与交付状态

主代理自审通过，未发现本次包装模块的阻塞问题。以上为自审和本地模块验证，不是独立评审或平台审核结论。维护 runbook、上架 checklist 与旧计划的接续说明已更新。

仅主分支合并产生了已授权的合并提交；新增功能及文档仍未暂存、未提交。没有推送或平台上架，原有未跟踪文件保留。

## 10. 扣子渠道追加交付（2026-09-14）

根据用户“打包一个用于扣子上架的包”的追加要求，新增 `coze` 渠道及 `agent-plugin-zip` 输出格式。依据[扣子官方导入说明](https://docs.coze.cn/create-plugin)和[Agent Plugins 1.0.0](https://agent-plugins.org/specification)，目标为“扩展 → 插件 → 上传插件包”，与扣子编程的 API/OpenAPI 插件创建入口分开。

- [x] 新增扣子 manifest、MCP 配置和事实源；公共远程 Skill 通过显式渠道名称替换复用。
- [x] 生成 `dist/channels/coze/production/0.1.0/patchxnote-coze-plugin-0.1.0.zip`，共 9 个文件，ZIP 为 19,676 字节，解压内容为 18,342 字节。
- [x] ZIP 根目录包含 `plugin.json`、`mcp.json`、`skills/` 和图标资产；生产端点为 `https://freenote.patch-x.cn/mcp`。
- [x] 两个 JSON 使用匹配的 Agent Plugins 1.0.0 schema，MCP 类型为 `streamable-http`；没有沿用 WorkBuddy 的 `timeout` 等非标准字段。
- [x] 使用现有 Python JSON Schema 库校验官方 schema 中的兼容结构约束，读取实际 ZIP 核对端点、文件内容、Skill 相对链接及模板渲染结果。
- [x] 仅验证扣子生成产物及本次文件修改，未执行其他渠道或业务模块回归，没有新增测试脚本。

复现命令：`node scripts/package-channel.mjs --channel coze`。本地校验通过；尚未在扣子平台进行导入、OAuth、工具调用或上架审核。该追加实现与已有改动一并保留在工作区，未提交、未推送。

## 11. 渠道入口更名与重新打包（2026-09-14）

用户要求渠道入口名称改为 `PatchXFreeNote`，并重新生成 `dist/channels` 下已有产物。

- [x] 在统一配置中设置 `common.branding.displayName: PatchXFreeNote` 与 `pluginName: patchxfreenote`；ZIP 名称通过 `{{DISPLAY_NAME}}` 读取同一展示名称。
- [x] 生成副本中的清单展示文案、Skill 标题/说明/示例及图标标题使用新名称。插件 manifest 的 name、marketplace 标识与包内插件路径同步为 `patchxfreenote`。
- [x] 保留现有 npm/CLI 命令、MCP 服务与工具名、Skill 标识、服务地址、版本及 WorkBuddy OAuth 使用的 `source: patchxnote-agent`。
- [x] 串行重新生成 WorkBuddy、Codex、Claude Code 的 production/test，以及 Coze 的 production，共 7 份。只重建已有渠道/环境/版本目录，新 ZIP 替换其中的旧名称 ZIP。
- [x] 全部构建返回 0；读取并逐项比较更名前后 59 个包内文件，确认只有预期展示文案与插件标识/路径发生变化。
- [x] 读取 3 份实际 ZIP，CRC 检查通过，9 个文件及内容分别与对应 bundle 一致；4 份插件 bundle 的 marketplace 引用均定位到实际生成的 `patchxfreenote` 目录。
- [x] 更新维护 runbook 和上架 checklist；验证限定在渠道生成模块，没有新增测试脚本或执行业务模块测试。

当前产物仍位于 `dist/channels/<channel>/<env>/<version>/`：

| 渠道 | 环境 / 版本 | 当前产物 |
| --- | --- | --- |
| WorkBuddy | production / 0.1.0 | `PatchXFreeNote-workbuddy-connector-0.1.0.zip`，19,980 字节 |
| WorkBuddy | test / 0.1.0 | `PatchXFreeNote-workbuddy-connector-0.1.0.zip`，20,030 字节 |
| Coze | production / 0.1.0 | `PatchXFreeNote-coze-plugin-0.1.0.zip`，19,872 字节 |
| Codex | production、test / 0.1.1 | 各自的 `bundle/`，插件在 `packages/plugins/openai/patchxfreenote/` |
| Claude Code | production、test / 0.1.1 | 各自的 `bundle/`，插件在 `packages/plugins/claude/patchxfreenote/` |

主代理自审与本地打包验证通过。本次更名没有修改公共 Skill 源、原有安装链路或服务端；尚未进行平台导入与审核，也未提交、推送或部署。

## 12. WorkBuddy 新连接器身份与服务端回调（2026-09-14）

用户上传第 11 节的包时，WorkBuddy 提示 `source=patchxnote-agent` 已存在。用户确认新建 PatchXFreeNote 连接器，并授权同步连接器标识、GoServer 回调及重新打包。

- [x] 为 WorkBuddy 配置 `connectorSource: patchxfreenote`，生成 metadata 的 `source` 和 Skill 事实源统一取该值；源码目录名、npm/CLI/MCP 工具标识保持原值。
- [x] GoServer 既有 `internal/agentoauth` 增加 `workbuddy://workbuddy/mcp/connector%3Apatchxfreenote/oauth/callback`，保留旧私有回调与 loopback；缺省展示名随新回调使用 `WorkBuddy PatchXFreeNote`。
- [x] 新连接器沿用 DCR，使用注册响应返回的 `client_id`。既有注册存储按回调集合和 scope 区分、复用客户端，无需数据库迁移；旧固定 client 保持原有绑定。
- [x] GoServer 两个新增定向测试先复现 400/invalid redirect，再通过修复；新旧注册、去重、默认名称、精确授权回调等 13 个相关顶层测试通过。OpenAPI 校验、兼容检查、Apifox 生成及已有 smoke 映射检查通过；未运行全量业务测试或真实平台授权。
- [x] 重新生成 WorkBuddy production/test 两份 ZIP，包内展示名均为 `PatchXFreeNote`，`source` 均为 `patchxfreenote`。读取实际 ZIP 验证 CRC、9 个条目、内容与 bundle 一致、所选 MCP 地址正确、Skill 无未渲染占位符。
- [x] 根据实际 ZIP 的 `source` 组合回调，核对其与 GoServer 实现及 OpenAPI/Apifox 请求、响应约束一致。

当前生产包为 `dist/channels/workbuddy/production/0.1.0/PatchXFreeNote-workbuddy-connector-0.1.0.zip`（19,976 字节）；测试包为 `dist/channels/workbuddy/test/0.1.0/PatchXFreeNote-workbuddy-connector-0.1.0.zip`（20,026 字节）。重新上传时选取本次生成的文件。其他渠道本轮未重新打包。

本地实现、主代理自审和上述限定验证通过。用户随后已授权两仓分别提交并普通推送，Agent 目标分支为 `codex/workbuddy-connector-package`，GoServer 为 `codex/backend-implementation`；Git 收口结果以实际提交及远端分支 SHA 核验为准。部署未授权；在线服务器必须部署本次回调支持后，才能验证新连接器的实际授权与工具调用。服务端对应记录见同级仓库 `docs/plans/2026-09-07-workbuddy-oauth-dcr-checklist-plan.md` 第 20 节。
