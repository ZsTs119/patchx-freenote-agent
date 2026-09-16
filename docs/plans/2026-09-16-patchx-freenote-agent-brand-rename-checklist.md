# PatchX Freenote Agent 品牌与仓库改名 Implementation Plan

**日期：** 2026-09-16

**状态：** 执行中；用户已于 2026-09-16 授权按计划完成改名、Git 提交／推送、发行和渠道更新。

**Goal：** 将 Agent 的品牌展示统一为 **PatchX Freenote**，将 GitHub 仓库改为 `ZsTs119/patchx-freenote-agent`，完成对应发行和渠道更新，并验证现有安装命令、配置、登录态及 Skill 仍可使用。

**Architecture：** 展示名称和源码仓库地址更新；npm、Skill、MCP 登记及运行时兼容标识保持稳定。复用原仓库历史、现有发行链路和服务地址，通过一个兼容更新版本完成品牌更新，不新建同功能 npm 包或 MCP 登记身份。

**Tech Stack：** Go CLI、本地 stdio／远程 MCP 代理、npm installer、Agent Skills、GitHub Actions／Release、npm Trusted Publishing、MCP Registry、skills.sh。

**执行约定：** 主代理按 checklist 串行实施、自审和验证；不使用子代理。当前请求已授权执行本计划。后续启动执行时沿用本次已确认的命名与兼容范围，常规实现、检查和已授权发布动作不重复索要确认。

---

## 1. 已确认的名称与范围

| 项目 | 本次结果 |
| --- | --- |
| 品牌 | `PatchX Freenote`，严格保持此空格和大小写 |
| Agent 展示名 | `PatchX Freenote Agent` |
| MCP／Skill 展示名 | `PatchX Freenote MCP` |
| GitHub 仓库 | `ZsTs119/patchxnote-agent` → `ZsTs119/patchx-freenote-agent`，原仓库原地改名 |
| npm 包名／npm bin 名 | 保留 `patchxnote-agent` |
| Skill 标识／目录 | 保留 `patchxnote-mcp`／`skills/patchxnote-mcp` |
| MCP Registry 唯一名称 | 保留 `io.github.ZsTs119/patchxnote-agent`，特别保留 owner 大小写 |
| 本机 CLI／发布资产文件名 | 保留 `patchxnote`／`patchxnote.exe` 与 `patchxnote_<version>_<os>_<arch>` |
| MCP 配置键／工具名 | 保留 `patchxnote`、`patchxnote_*`；协议结构与工具行为不变 |
| 配置／凭据／Skill 管理标记 | 保留现有路径、钥匙串 service、标记文件和识别字段 |
| 环境变量／Go module | 保留 `PATCHXNOTE_*`、既有兼容变量和 `github.com/ZsTs119/patchxnote-agent` module/import/ldflags 路径 |
| OAuth／已有渠道身份 | 保留 client ID、scope、callback、connector source、plugin ID 等机器标识 |
| 服务地址 | 保留 `https://freenote.patch-x.cn`、`/mcp`、`/mcp/setup/` |
| 许可 | 保留现状，包括 Skill 的 `UNLICENSED` |

- [x] 用户已确认：品牌展示和 GitHub 仓库先统一，npm 包名、Skill 标识、MCP 登记 ID 保留兼容。
- [x] 范围仅为 **Agent 仓库及对应已发布渠道的品牌／仓库关联更新**。
- [x] GoServer、App、其他仓库及它们的部署不在本次范围。服务端托管授权页若仍显示旧品牌，单独说明归属；本仓库只更新自己提供的页面和材料。
- [x] 不要求已安装用户更改命令、重新配置 MCP 或因本次改名重新登录；实际登录过期与改名导致的凭据丢失分别判断。
- [x] 旧名称可以存在于兼容标识、历史版本、变更记录和迁移说明，不以“全仓旧词零出现”作为完成条件。

## 2. 执行基线与工作区

| 基线 | 已核对信息 |
| --- | --- |
| 当前本地工作区 | `/home/zsts_119/patchnote-agent`，分支 `codex/workbuddy-connector-package`，HEAD `f60786a` |
| 当前公开 main | `8cbc877742ad5475163ae145600e5b610821e05c`，中英文 README 已优化 |
| 现有发行物 | `patchxnote-agent@0.2.14`／GitHub `v0.2.14` |
| 原 Registry 条目 | `io.github.ZsTs119/patchxnote-agent`，已发布 `0.2.14` |
| 原 skills.sh 来源 | `zsts119/patchxnote-agent/patchxnote-mcp` |
| 旧任务记录 | `docs/plans/2026-09-15-skill-mcp-directory-publication-checklist.md` |

### Task 1：核对基线并建立本次工作区

- [x] 读取仓库 `AGENTS.md`、README、`docs/engineering-rules.md`、`docs/release-and-maintenance-runbook.zh-CN.md` 和原发行记录；执行前刷新 main、版本、工作区状态。
- [x] 基于最新公开 main 建立 `codex/patchx-freenote-branding` 工作分支／工作区，将本计划带入；保留 workbuddy 分支未发布的功能和渠道工作，不直接整体合并到 main。
- [x] 核对目标仓库名 `ZsTs119/patchx-freenote-agent` 可用、现有 GitHub 身份具有改名与发布权限、npm 旧包的发布设置可操作。
- [x] 选择下一个未占用的正常版本，候选为 `0.2.15`，实际版本在执行记录中固定；Skill 文案更新递增自己的 metadata version，标识不变。
- [x] 记录原仓库 ID、main／tag、npm `latest` 指向及旧元数据、Registry 记录、skills.sh 来源和实际安装状态，作为改名后比较与恢复基线。
- [x] 改名前准备隔离的旧版安装与 Skill 升级样本，保留旧仓库来源的锁文件；分别记录 npm 托管 Skill、skills CLI 安装和各渠道生成包的身份，避免只验证全新安装。
- [x] 对已有安装仅记录路径、版本、profile／凭据是否存在、配置键和检查结果；不导出 token、webhook URL 或真实记录正文。

只读预检示例（在实际执行工作区运行）：

```sh
git status -sb
git log -1 --oneline
git remote -v
gh repo view ZsTs119/patchxnote-agent --json id,nameWithOwner,defaultBranchRef,viewerPermission
npm view patchxnote-agent version mcpName repository.url --registry https://registry.npmjs.org
```

**完成标准：** 本次发行基线明确，原 workbuddy 工作内容得到保留，新仓库名称和发布身份不存在未处理冲突。

**执行依赖：** Task 2／3 的材料、Task 4 的发行身份修正，以及 Task 5 的相关选测调整，都先完成本地验证；随后按“原仓库改名 → 旧下载入口回读 → 新地址提交／推送并核对 main → tag／GitHub Release → 实际 npm 包预装 → npm 发布 → Registry 更新 → Skill 来源与目录验收”串行执行。写在后面的发布前检查不能等 tag 已触发工作流后再补。

## 3. 展示与源码材料更新

### Task 2：统一 Agent 展示品牌

**主要文件：**

- `README.md`、`README.zh-CN.md`、`packages/npm/README.md`
- `docs/assets/patchxnote-agent-cover.en.png`、`patchxnote-agent-cover.zh-CN.png`、`patchxnote-agent-quickstart.en.png`、`patchxnote-agent-quickstart.zh-CN.png`
- `internal/cli/root.go`、其他包含当前产品展示文案的 CLI 文件
- `internal/oauthflow/callback.go` 及对应文案断言
- `skills/patchxnote-mcp/SKILL.md` 和 `references/`
- `docs/marketplace/listing.en.md`、`listing.zh-CN.md`、`mcp-registry.zh-CN.md`、`publishing-checklist.zh-CN.md`、`privacy-security.md`
- 当前接入文档、`docs/release-and-maintenance-runbook.zh-CN.md`、`server.json`
- GitHub 仓库 About 描述、topics 与现有社交预览图（若已配置）

- [x] 将用户可见的当前产品标题、说明、帮助文字、本机 OAuth callback 页和有效素材改为新品牌；中英文统一使用 `PatchX Freenote`。
- [x] 更新 README 的四渠道链接、仓库链接及完整 AI 接入提示中的品牌／参考地址；保留已有完整接入步骤，命令与工具标识仍使用旧稳定名称。
- [x] 用 imagegen 更新四张当前使用的双语图片并目检文字；历史素材不重做，不以移除旧图为前置。
- [x] CLI `Use`、二进制名称、版本 JSON 字段、MCP `serverInfo.name`、工具名和输入输出 schema 保持兼容；显示文本改名不改变程序可解析的身份字段。
- [x] Skill 的 `name: patchxnote-mcp` 不变，更新标题、描述、author、仓库 URL 和品牌触发词；继续识别用户说出的旧品牌 `PatchXNote`，避免已有提示失效。
- [x] 同步 GitHub About 的旧品牌描述和新品牌检索词，保留相关技术／旧品牌 topics；npm keywords 同样增加新品牌词并保留旧关键词。当前 GitHub homepage 为空，可填写既有生产接入页，不新建站点。
- [x] 逐项区分展示词与实际路径：Windows／macOS 的 `PatchXNote Agent` 配置、缓存、安装目录即使包含大写品牌也保持原样，文档内的真实路径示例同步遵守；生成包也不能对这些字段做全局替换。
- [x] 保留正文中首次出现的简短“原 PatchXNote”说明即可；历史 release/evidence 不改写成新品牌当年的发布事实。
- [x] 没有独立 display 字段的 plugin／connector，先核对字段含义；`name` 若是机器 ID 则保持原值，通过允许的标题／描述字段展示新品牌。

**完成标准：** 当前 Agent 的文案和有效图像展示新品牌，命令、数据格式、OAuth 及行为无品牌之外的变化。

### Task 3：同步 Skill 与 Agent 内渠道副本

**公开 main 的文件：**

- `scripts/sync-patchxnote-skill-packages.mjs`、`scripts/validate-patchxnote-skill-packages.mjs`
- `packages/npm/skills/patchxnote-mcp/`
- `packages/plugins/openai/patchxnote-agent/`、`packages/plugins/claude/patchxnote-agent/`
- `.agents/plugins/marketplace.json`、`.claude-plugin/marketplace.json`

**当前 workbuddy 分支额外存在的文件：**

- `packages/distribution/channels.json`、`scripts/package-channel.mjs`
- `packages/workbuddy/patchxnote-agent/`、`packages/plugins/coze/patchxnote-agent/`

- [ ] 先更新 canonical Skill，再用现有同步脚本更新 npm／OpenAI／Claude 副本；检查副本一致性和引用文件完整性。
- [ ] 保留 `.patchxnote-agent-skill.json`、`managed_by`、skill slug 和既有安装目录，使已托管 Skill 正常更新，而不是安装出第二份 Skill。
- [ ] 只同步 workbuddy 分支现有渠道材料的品牌与仓库引用；保留其 connector source、pluginName、OAuth 和环境差异。使用针对性提交，避免把无关渠道功能带入公共发行。
- [ ] 检查 `brandText`／`brandJSON` 等转换只修改展示文案，避免生成重复的 “PatchX Freenote Freenote” 或把技术字段、真实路径、旧品牌识别说明一起替换。
- [ ] 按“源码材料／生成包”分别固定身份基线：公开插件源码目前使用 `patchxnote-agent`，workbuddy 分支的生成器会用 `branding.pluginName=patchxfreenote` 改写 manifest、marketplace 和目录，WorkBuddy 的生成 source 也是 `patchxfreenote`。本次只改显示名，不将两套现有分发身份强行统一；对生成后的字段逐一比对，不能仅检查源 JSON。
- [ ] 对本次受影响的现有渠道和 production／test 配置串行生成并解包检查：品牌、六文件、marketplace 相对路径、plugin／connector 身份、原服务地址和占位符均正确；复用既有生成／校验脚本，不做平台上架、登录或业务调用。
- [ ] 同步 workbuddy 材料时，以公开 main 已修正的发行事实为准，避免将该分支旧的 `0.2.13` 或小写 `io.github.zsts119/...` 回写公共发行；只带入本次品牌所需变更，不整体合并分支。
- [ ] 未上架的平台只更新 Agent 仓库中的材料，不新增腾讯／ClawHub 等正式提交任务。

命令（在具备对应脚本的工作区执行）：

```sh
node scripts/sync-patchxnote-skill-packages.mjs
node scripts/sync-patchxnote-skill-packages.mjs --check
node scripts/validate-patchxnote-skill-packages.mjs
```

**完成标准：** 同一 Skill 更新后仍是原标识、原目录；已存在渠道材料的新品牌一致，不带入额外功能发布。

## 4. 仓库改名与兼容发行

### Task 4：先准备发布链路，再改 GitHub 仓库

**文件与外部设置：**

- `packages/npm/package.json`、`packages/npm/bin/patchxnote-agent.js`
- `scripts/validate-release-metadata.mjs` 和相关测试断言
- `.github/workflows/release.yml`、`publish-npm.yml`、其他引用原仓库的 workflow
- `.goreleaser.yaml` 的仓库关联引用；module、binary 与制品名保持不变
- npm 现有包的 Trusted Publisher 设置、GitHub repository name、各相关 clone 的 Git remote

- [ ] npm 保留 `name=patchxnote-agent` 和 `mcpName=io.github.ZsTs119/patchxnote-agent`；更新 repository URL、描述、关键词与发行版本。
- [ ] 安装器默认 release 下载地址指向新仓库；保留旧制品文件名、安装目录、版本校验、HTTPS 重定向与 checksum 行为。
- [ ] 修正发行校验中的 `pkg.name === repository basename` 和从包名推导所有身份的假设。分别验证“新仓库 URL”“旧 npm 包名”“旧 MCP ID”，不能误把 Registry ID 改成新仓库名。
- [ ] 验证这种分离后，错误 owner 大小写、npm/mcpName 不一致、错误版本和丢失 `mcp serve` 参数仍会被拒绝。
- [ ] npm Trusted Publisher 增加新仓库与现有 `publish-npm.yml` 的绑定，核对 owner／仓库／workflow 大小写、已有 environment 约束，以及允许当前工作流使用直接 `npm publish`；保留现有发布方式。能预配时在改名前完成，否则改名后、发布前完成。实际账号登录需要本人操作时，仅交接该平台步骤，不重复确认整个改名范围。
- [ ] 绑定“保存成功”只作为配置证据；新仓库 OIDC 实际发布成功并有对应 provenance 后，才确认发布链路迁移完成，再移除失效的旧仓库绑定。保留现有 Node／npm 支持版本和 `id-token: write`。
- [ ] 本地材料与相关测试通过、执行所需账号环节可完成后，再原地重命名 GitHub 仓库为 `patchx-freenote-agent`；不新建替代仓库，不迁移 GitHub owner。
- [ ] 回读 repository ID 与改名前相同，确认历史 commit、tag、Release、Stars 等仍属于同一仓库；不重新创建同 owner 下的旧仓库名。
- [ ] 改名后立即从旧地址读取仓库与旧版 Release 下载地址，下载旧版二进制及 checksums 并比对改名前散列；同时检查当前文档实际使用的 raw 图片／文件和 badge 链接。网页能跳转不能替代安装器下载成功。
- [ ] 更新相关 clone 的 origin URL，并识别同一 Git 仓库下共享 remote 配置的 worktree；本地目录名、Go module/import、版本 ldflags 路径不必随之改变。
- [ ] 在新仓库地址提交／推送本次兼容变更，核对公开 main 已包含新品牌、canonical Skill 和新发布 workflow；再让发行 tag 指向同一已验证提交。原标签与原 Release 文件保持不变。

预期 identity 示例（描述等字段省略）：

```json
{
  "npmName": "patchxnote-agent",
  "mcpName": "io.github.ZsTs119/patchxnote-agent",
  "repositoryUrl": "https://github.com/ZsTs119/patchx-freenote-agent",
  "displayTitle": "PatchX Freenote Agent",
  "skillName": "patchxnote-mcp"
}
```

**完成标准：** 原仓库改名完成且历史保留；新仓库可以为原 npm 包发布，旧下载路径及新下载路径均有明确验证。

发布绑定依据：[npm Trusted Publishing 文档](https://docs.npmjs.com/trusted-publishers/)明确要求精确匹配仓库与 workflow，且保存绑定时不会验证配置是否可用；新建连接还需核对所允许的发布动作。

### Task 5：发布同包名兼容更新

- [ ] Release、npm 和 server.json 使用一致的本次版本；Skill 自身版本单独递增，不要求与二进制版本一致。
- [ ] 检查本次 CLI／callback 文案和安装地址变更只触发第 6 节相关检查。现有 release 工作流遇到任何 Go 改动会跑全仓测试，需要在本次发行前处理此选测问题，不能忽略远端执行范围。
- [ ] 如调整选测，限于明确可识别的本次品牌／发布变更；对其他运行逻辑变化保留原有验证。验证“本次品牌改动走相关检查”和“普通逻辑变化不会被误跳过”，不做全局无条件跳过。
- [ ] 核对现有其他自动触发项：`macos-install-smoke.yml` 在 npm 文件 PR 变动时会安装默认旧版 `0.2.6`，该结果不能当作新版验收。如使用此 smoke，显式传本次已发布版本，并与其他验证串行；不以修正默认值为由扩展整套 CI 改造。
- [ ] 串行完成六平台制品构建、checksums／attestation；从确定的发行提交执行 `npm pack`，检查真实 tarball 中的 launcher、package.json、README 和完整 Skill，再在隔离目录安装该 tarball，确认能从新仓库下载并启动本次 Windows 二进制。`npm pack --dry-run` 不能替代这一步。
- [ ] 真实 tarball 预装通过后，触发原 npm 包的 Trusted Publishing；等待其结束，明确核对 `dist-tags.latest` 已指向本次版本。当前流程直接更新 latest，因此把实际包预装放在公开 npm 发布之前，不另加暂存发布或人工审批流程。
- [ ] 回读 npm 版本、原包名、原 mcpName、新仓库 URL 和 provenance；检查下载的真实 tarball 与 integrity 一致。
- [ ] 核对全部发行资产及 checksum／来源证明；Windows 做一次实际安装与旧命令启动。其他平台对未变的行为复用既有结果，不因名称更新重做业务回归。
- [ ] 老版本 `patchxnote-agent@0.2.14` 仍能通过旧仓库路径取得其固定版本制品；旧包 `@latest` 能获取新版，两个入口均保留。隔离安装目录和下载缓存，防止因命中已有二进制而误判旧下载入口可用；其中一个隔离样本按“旧版 → 新版”复用同一路径完成真实升级。

**完成标准：** 同一个 npm 包已发布品牌更新，新旧安装入口可用；发布证明对应新仓库和本次 tag，不要求改写旧版本证明。

## 5. 已发布目录更新

### Task 6：沿用 MCP 身份，更新 skills.sh 来源

- [ ] Registry 保留 `name=io.github.ZsTs119/patchxnote-agent`、npm identifier 和 stdio 参数；只更新展示 title／description、repository 和本次版本。
- [ ] 官方 publisher 校验通过后，以现有 GitHub 身份发布原条目的新版本；不覆盖 `0.2.14`，不创建新 ID。
- [ ] 从官方版本详情及搜索分别回读，核对名称、标题、npm 版本、仓库与 `mcp serve` 参数。公开搜索 `PatchX Freenote`／`patchxnote` 的实际效果分别记录，不假定搜索一定索引展示标题。
- [ ] skills.sh 的 Skill slug 仍为 `patchxnote-mcp`，但来源仓库路径将改变。新候选详情页为 `https://skills.sh/ZsTs119/patchx-freenote-agent/patchxnote-mcp`；在实际正文有效前不将候选写成已验收链接。
- [ ] 用新公开仓库地址进行一次项目级安装验证，检查 Skill 名称、六文件／引用和锁文件来源；复用已完成的 npm Skill 内容检查，不重复安装制造统计。
- [ ] 复用 Task 1 的 skills CLI 旧来源锁文件样本，按该 CLI 实际支持的检查／更新方式验证旧来源仍可取得新版内容；若需用新仓库重新指定来源，验证原 slug 原位更新，并给出一次性更新命令。npm 的 managed marker 验证不能替代 skills CLI 的锁文件／更新验证；测试只涉及该 Skill，不对用户全部已安装 skills 执行批量 update。
- [ ] 新来源的首次真实安装承担索引触发，确认该次 telemetry 未关闭；额外旧版升级／重复回归样本关闭 telemetry。确认公开默认分支上的新 Skill 内容已到位后再触发收录。[skills CLI 文档](https://skills.sh/docs/cli)说明安装遥测用于榜单统计。
- [ ] 查询新来源的索引／正文，并检查旧 skills.sh URL 实际行为。GitHub 的仓库重定向不能当作 skills.sh 自身的重定向或安装数迁移证明。
- [ ] 无索引时记录最后检查时间、实际来源、后续人工复查窗口；平台支持迁移时按其机制处理。统计归并无官方保证，不以重复安装或改 slug 解决。
- [ ] 在 README／PPT 链接说明中提供实际可用的新仓库、原 npm 包、原 MCP ID 的最新版、有效 skills.sh 页面；旧链接若仍可用，作为兼容入口说明。
- [ ] 区分可控展示和平台固定标识：Skill 标题／正文、Registry title、npm 描述展示新品牌；平台仍显示 `patchxnote-mcp`／`patchxnote-agent` 属于保留兼容的预期结果。分别记录“新品牌词可搜”“旧标识可搜”“详情页可访问”，不承诺三者随改名立即同时更新。
- [ ] 使用指定 `@chrome` 核对品牌页面和截图；连接不可用时继续 API、安装工作，仅保留浏览器项未验证，不能替换成 IAB。

候选安装命令（仅在仓库改名完成后执行）：

```sh
npx -y skills add ZsTs119/patchx-freenote-agent --skill patchxnote-mcp --agent codex --yes
```

**完成标准：** MCP 原身份的新版本可查；Skill 新来源可安装、可检索且正文有效。目录缓存、统计归并或截图未完成时单列，不影响已通过项目的证据保留。

## 6. 仅验证本计划相关模块

执行补充：Agent 当前用户可见品牌也出现在 `internal/mcp`／`remotemcp` 错误说明和 `renderdoc`／`webhook` 默认标题中，本次仅替换这些展示字符串；使用 `scripts/test-branding.sh` 运行它们对应的现有协议／标题用例，不调用真实 webhook 或业务工具。

| 模块 | 本次必要检查 | 通过标准 |
| --- | --- | --- |
| 双语文档和图片 | 品牌拼写、完整接入提示、命令一致性、Markdown／图片／链接 | 新品牌可见，兼容命令未误改，正文可正常阅读 |
| CLI 与本机 callback 展示 | help／version／callback 对应现有用例，stdout／JSON 格式 | 新文案正确，原命令和机器输出保持兼容 |
| 发行关联校验 | 新仓库＋旧包名＋旧 MCP ID 正例；身份／版本／参数错误反例 | 正确组合可发布，真实错误仍被拒绝 |
| 安装器与重定向 | 旧 0.2.14 固定安装、新版安装／更新、checksum、旧配置启动 | 老包能下载旧资产，新版报告正确版本，旧配置仍可启动 |
| 既有配置和登录态 | 同运行时／profile 升级前后状态、原 MCP 配置及 webhook 别名是否仍可解析 | 不因改名丢登录态或生成重复配置；不测试 webhook 外发 |
| Skill 更新 | 已托管旧目录升级、marker 识别、新公开仓库安装、副本一致性 | 仍为同一个 patchxnote-mcp，无新旧两份重复安装；手动修改目录继续按原规则处理 |
| skills CLI 旧来源升级 | 旧 source／锁文件检查与更新、新来源原位安装 | 同一 Skill 能更新，来源和内容可追溯；与 npm 托管安装分别记录 |
| 渠道生成包 | 受影响渠道逐个生成、解包，比较源码和生成后的身份、目录、URL | 新品牌正确，原渠道 ID、Skill slug、安装目录和环境保持一致 |
| 协议与目录 | initialize、tools/list、Registry 回读、skills.sh 来源与正文 | 协议正常；本地工具集／已连接远端工具集分别与升级前比较 |
| GitHub／npm 发布 | repository ID、main／tag／资产、真实 tarball 预装、latest、provenance、旧 URL 与新 URL | 同一仓库历史保留，公开默认分支与发布对应，可信发布和两代安装入口正常 |

相关命令示例：

```sh
node scripts/validate-release-metadata.mjs
node scripts/sync-patchxnote-skill-packages.mjs --check
node scripts/validate-patchxnote-skill-packages.mjs
node packages/npm/test/install.test.js
go test -p 1 -parallel 1 ./internal/cli -run 'Test(RootHelpIncludesCommandAndGlobalFlags|VersionPlainOutput|VersionJSONOutput|MCPConfigPrintsSecretFreeJSON|MCPLoginBrowserOAuthStoresCredentialAndDoesNotLeak|MCPLoginAlreadyLoggedInAndForceReplacement|MCPServeWritesJSONRPCToStdoutOnly|MCPServeInitializeReportsBuildVersion|MCPServeUsesRemoteProxyWhenCredentialExists)$'
go test -p 1 -parallel 1 ./internal/oauthflow -run '^TestCallbackServerSuccessAndFailurePagesDoNotLeakQuery$'
git diff --check
```

- callback 已有测试位于 `internal/oauthflow/oauthflow_test.go`，覆盖成功／失败页面和查询参数不泄露；更新其中的品牌断言并运行上述真实用例。npm 安装器测试也有旧品牌标题断言，改展示断言而保留路径／机器 ID 断言；不为纯文案新建重复测试。
- 安装器现有单文件测试覆盖本次受影响安装／Skill 模块，可以执行；不扩展到全仓 Go、账号业务、模型效果、硬件、App 或其他服务部署测试。
- 登录态兼容先用现有 fixture 验证，再复用当前有效登录态执行一次 `mcp status --verify --output json`。没有有效旧会话时，明确“旧真实会话升级未验证”，不拿重新登录成功替代旧会话保留。
- `initialize`／`tools/list` 是协议检查，不默认执行会额外调用账号／记忆工具的 `scripts/smoke-mcp-stdio.mjs`。不把新版正常刷新已到期 token 判成改名导致重新登录。
- 新旧包安装放在独立任务目录；已有客户端不默认重跑 setup 写配置，不运行 logout 清凭据。机器化比较只保留状态、字段、数量与散列，不保存秘密值。
- 六平台构建和资产校验属于本次发行范围；不要求六平台全业务回归。任一实际检查失败，修正关联问题后只重验受影响项。
- 新旧 URL 验证应覆盖“旧固定版本下载”“新固定版本安装”“公开 latest 安装”“同路径升级”四种结果，可复用同一阶段的下载与散列证据；不因 checklist 多处引用同一证据而重复跑测试。

## 7. 收尾与恢复

### Task 7：交付实际结果与兼容说明

- [ ] 主代理自审：逐项核对第 1 节稳定标识和第 6 节结果，确认只有品牌、仓库引用及相关发布检查发生变化。
- [ ] 记录实际提交、tag、GitHub／npm workflow、Registry 版本、skills.sh 新旧页面状态；更新本计划与 `docs/evidence/2026-09-16-patchx-freenote-branding.zh-CN.md`。
- [ ] 将“原 PatchXNote，现 PatchX Freenote；原安装命令继续可用”的短说明放在当前文档，无需遍历改写旧历史记录。
- [ ] 检查公开 main 和 workbuddy 等本次涉及分支的变更归属，各自只提交关联内容；原未提交用户工作保留。
- [ ] 最终交付新品牌链接、测试结果、Git 状态和仍需平台处理的具体项目，不把平台取证待补写成整体已验收。

恢复原则：npm／Registry 已发布版本不可覆盖；出现新版问题时保留旧固定版本可安装，修复后发布后续版本。若故障已影响 `@latest` 安装，将 latest 恢复到 Task 1 记录的上一稳定版本并重新验证默认安装；已发布版本不删除。GitHub 改名后若后续发布失败，先依靠已验证的旧下载重定向维持现有版本，不反复改名。发布响应超时或不确定时先回读版本／资产／Registry 状态，再决定是否重试，避免重复创建发行。原仓库名保持未被重新占用，原 tags、Release 资产与配置／凭据身份保持可用。

latest 恢复使用 npm 维护者可用的标签管理权限；需要本人完成账号验证时仅交接这一操作。[npm dist-tag 文档](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/)说明默认安装与 latest 的关联及标签修改方式。

### 计划自审结论（2026-09-16）

本次由主代理对照公开 main、当前 workbuddy 分支和平台官方文档自审，不作为独立审核证据。已将以下遗漏补入对应 checklist：

1. **发布顺序：** 选测与身份修正必须先于 tag；先真实 tarball 预装，再公开 npm；main、tag、latest 与来源证明分别核对。
2. **身份兼容：** 大写品牌也存在于真实本机路径；渠道生成器会覆盖 plugin／connector 身份，需要校验生成结果，不能只看源码。
3. **旧用户升级：** npm marker 与 skills CLI 旧来源锁文件是两条升级链路；需要冷缓存下载及同路径升级证据。
4. **可见品牌：** 补 GitHub About／关键词；渠道仍显示旧技术标识和平台缓存属于单独记录的事实。
5. **精确验证：** 补已有 OAuth callback 用例、渠道生成包检查、macOS smoke 默认旧版本识别；检查仍只覆盖本计划影响的模块。
6. **故障收尾：** 补 latest 恢复基线和发布结果不确定时的回读顺序，保留现有可用发行。

## 8. 当前检查点

- **授权：** 2026-09-16 用户“那开始吧”，执行本计划全部范围。
- **执行工作区：** `/home/zsts_119/patchnote-agent-freenote`，分支 `codex/patchx-freenote-branding`，基于 main `8cbc877742ad5475163ae145600e5b610821e05c`。
- **已完成：** 规则／合同核对、GitHub ADMIN 权限与新名可用性检查、npm latest=0.2.14／候选0.2.15未占用确认；旧 npm tarball、二进制、Registry 回读、npm 托管 Skill 和 skills CLI 旧来源样本已留存。
- **证据目录：** `C:/Users/11979/AppData/Local/Temp/patchx-freenote-branding-20260916`；原仓库 ID `1324845696` / `R_kgDOTveKgA`。
- **登录基线：** Windows default profile 在旧版即返回 `server_or_client_mismatch`，未修改已有配置或登录态；实际旧有效会话升级验收另查。
- **平台：** Chrome 已恢复、用户已登录 npm；用户完成新 Trusted Publisher 提交；Chrome 回读显示新旧绑定并存、workflow 正确、environment 留空、允许 npm publish。实际 OIDC 发布待验证。
- **已完成实现／检查：** 四张双语图和品牌材料；发行身份／选测检查；安装器、Skill 副本、Go 相关用例；8 组渠道包身份比对；双语 README GFM、命令与链接验证。
- **已完成改名：** 原仓库 ID 不变，现为 `ZsTs119/patchx-freenote-agent`；About／topics 已更新；共享 origin 已更新。旧包0.2.14通过旧 URL冷安装成功，二进制 SHA256 与基线一致，旧 raw 图和 badge 可访问。
- **进行中：** Git 提交／推送、GitHub v0.2.15 构建与发布；npm／Registry／skills.sh 后续验证未执行。
- **下一步：** 提交兼容变更并推送 main，tag 触发串行发行；GitHub 制品通过后预装实际 npm tarball，再执行 OIDC 发布。

## 9. 官方依据

- [GitHub 仓库改名与旧地址重定向](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)
- [npm Trusted Publishing：仓库／workflow 绑定](https://docs.npmjs.com/trusted-publishers/)
- [npm dist-tag：默认安装版本与标签管理](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/)
- [MCP Registry 版本和元数据不可变规则](https://modelcontextprotocol.io/registry/versioning)
- [MCP Registry 元数据字段](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/generic-server-json.md)
- [skills.sh 收录来源](https://skills.sh/docs/faq)
- [skills CLI 安装与遥测说明](https://skills.sh/docs/cli)
- [skills.sh 仓库页展示配置及缓存更新](https://skills.sh/docs/customize)

本计划执行结果按完成的证据逐项更新；不将文档检查视为运行时或渠道验收。
