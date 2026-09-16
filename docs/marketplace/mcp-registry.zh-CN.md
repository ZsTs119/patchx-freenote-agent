# Official MCP Registry Publishing Notes

更新日期：2026-09-15

PatchX Freenote Agent 的 MCP Registry 登记名称：

```text
io.github.ZsTs119/patchxnote-agent
```

这个名称必须和 `packages/npm/package.json` 的 `mcpName` 以及根目录 `server.json` 的 `name` 一致。

## 当前文件

- `server.json`
- `packages/npm/package.json` 的 `mcpName`

## 发布前检查

```sh
npm view patchxnote-agent version dist-tags.latest repository.url --registry https://registry.npmjs.org
mcp-publisher validate
```

Registry 只托管 MCP server metadata，不托管 npm 包本身。因此必须先确认对应 npm 版本已经发布并可访问，再发布 registry metadata。

## Auth 边界

`mcp-publisher login github` 可能要求在浏览器或 GitHub device flow 中完成授权。授权码只用于用户自己的终端/浏览器流程，不应贴进 AI 聊天、文档或 evidence。

## 不做的事

- 不在 `server.json` 写入 access token、refresh token、webhook secret 或 API key。
- 不声明环境变量，除非后续有真实 public flow 需要，并且 schema 标记 secret。
- 不把 registry publish 说成具体 AI 客户端已验收。

## 0.2.14 元数据修正

Registry 实际授予的个人发布权限为 `io.github.ZsTs119/*`，区分大小写。旧 `0.2.13` 使用小写 `zsts119`，授权成功后仍无法匹配发布权限；npm 包与登记名也必须精确一致。因此 `0.2.14` 同步修正两个字段，并补齐 stdio 入口的 `mcp serve` 参数、100 字符以内描述及展示链接。

`node scripts/validate-release-metadata.mjs` 校验账号大小写、版本关联、入口参数和六个目标制品 URL；纯元数据版本在 CI 复用未变的运行时／安装器测试结果，相关模块变化或缺少比较基线时仍执行原有测试。正式登记状态以 `docs/evidence/2026-09-15-release-0.2.14.zh-CN.md` 的发布后回读为准。
