#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const defaultConnectorRoot = path.join(repoRoot, "packages", "workbuddy", "patchxnote-agent");
const maxZipBytes = 20 * 1024 * 1024;

function fail(message) {
  throw new Error(message);
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${path.relative(repoRoot, filePath)} is not valid JSON: ${error.message}`);
  }
}

function assertFile(connectorRoot, relativePath) {
  const filePath = path.join(connectorRoot, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`missing required file: ${relativePath}`);
  }
  return filePath;
}

function assertNoFile(connectorRoot, relativePath) {
  const filePath = path.join(connectorRoot, relativePath);
  if (fs.existsSync(filePath)) {
    fail(`unexpected file in WorkBuddy MCP + Skill package: ${relativePath}`);
  }
}

function compareVersion(a, b) {
  const parse = value => String(value).split(".").map(part => Number.parseInt(part, 10));
  const left = parse(a);
  const right = parse(b);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const x = Number.isFinite(left[index]) ? left[index] : 0;
    const y = Number.isFinite(right[index]) ? right[index] : 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function walkFiles(root) {
  const files = [];
  const entries = fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function readTextPackageFiles(connectorRoot) {
  return walkFiles(connectorRoot)
    .filter(filePath => [".json", ".md", ".svg", ".txt"].includes(path.extname(filePath).toLowerCase()))
    .map(filePath => ({
      filePath,
      relativePath: path.relative(connectorRoot, filePath).split(path.sep).join("/"),
      text: fs.readFileSync(filePath, "utf8")
    }));
}

function validateConnectorMeta(meta) {
  for (const field of ["name", "name_zh", "name_en", "description", "description_zh", "description_en", "source", "type", "version"]) {
    if (typeof meta[field] !== "string" || meta[field].trim() === "") {
      fail(`connector-meta.json field ${field} must be a non-empty string`);
    }
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.source)) {
    fail("connector-meta.json source must be kebab-case");
  }
  if (meta.type !== "mcp") {
    fail("connector-meta.json type must be mcp");
  }
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(meta.version)) {
    fail("connector-meta.json version must be semver-like");
  }
  for (const field of ["examples_zh", "examples_en"]) {
    if (!Array.isArray(meta[field]) || meta[field].length < 2 || meta[field].length > 5) {
      fail(`connector-meta.json ${field} must contain 2 to 5 examples`);
    }
    for (const example of meta[field]) {
      if (typeof example !== "string" || example.trim() === "") {
        fail(`connector-meta.json ${field} must contain only non-empty strings`);
      }
    }
  }
  if (typeof meta.minWorkbuddyVersion !== "string" || compareVersion(meta.minWorkbuddyVersion, "5.0.0") < 0) {
    fail("connector-meta.json minWorkbuddyVersion must be at least 5.0.0 for CLI preAuth");
  }
  if ("auth_mode" in meta) {
    fail("connector-meta.json uses CLI preAuth, not a remote auth_mode");
  }
}

function validateMCPConfig(config, expectedURL, expectedCLIVersion) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    fail("mcp.json must be an object");
  }
  const servers = config.mcpServers;
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    fail("mcp.json must contain mcpServers object");
  }
  const names = Object.keys(servers);
  if (names.length !== 1) {
    fail("mcp.json must contain exactly one MCP server");
  }
  const server = servers[names[0]];
  if (!server || typeof server !== "object" || Array.isArray(server)) {
    fail("mcp.json server entry must be an object");
  }
  if (config.preAuth !== "cli" || server.type !== "stdio" || server.command !== "npx") {
    fail("mcp.json must use top-level CLI preAuth and the npx stdio launcher");
  }
  if (server.runtime?.type !== "node" || server.env?.PATCHXNOTE_MCP_MODE !== "remote") {
    fail("mcp.json must declare Node and use the existing remote proxy mode");
  }
  const args = server.args;
  const packageName = args?.[1];
  if (!Array.isArray(args) || args[0] !== "--yes" || !/^patchxnote-agent@\d+\.\d+\.\d+$/.test(packageName ?? "")) {
    fail("mcp.json must pin the CLI package version");
  }
  if (expectedCLIVersion && packageName !== `patchxnote-agent@${expectedCLIVersion}`) {
    fail("mcp.json CLI version differs from the channel configuration");
  }
  const baseURL = expectedURL.replace(/\/mcp$/, "");
  if (args[2] !== "mcp" || args[3] !== "serve" ||
      args[args.indexOf("--profile") + 1] !== "workbuddy" ||
      args[args.indexOf("--server-base-url") + 1] !== baseURL || "url" in server) {
    fail("mcp.json must use mcp serve with the workbuddy profile and selected API base URL");
  }
  return { packageName, baseURL };
}

function validateCLIConfig(config, { packageName, baseURL }) {
  if (config.runtime?.type !== "node" || config.authWaitForExit !== true ||
      config.authUrlDomain !== new URL(baseURL).hostname) {
    fail("cli.json must declare Node and retain the browser callback process");
  }
  const matcher = new RegExp(config.statusMatch ?? "");
  if (!matcher.test('{"authenticated":true}') || matcher.test('{"authenticated":false}')) {
    fail("cli.json statusMatch must distinguish authenticated true from false");
  }
  for (const platform of ["darwin", "linux", "win32"]) {
    const launcher = platform === "win32" ? "npx.cmd" : "npx";
    for (const [action, command] of Object.entries({ init: "install", auth: "mcp login", status: "mcp status", unAuth: "mcp logout" })) {
      const value = config[action]?.[platform];
      if (typeof value !== "string" || !value.startsWith(`${launcher} --yes ${packageName} ${command}`)) {
        fail(`cli.json ${action}.${platform} must use the same pinned CLI package`);
      }
      if (action !== "init" && (!value.includes("--profile workbuddy") || !value.includes(`--server-base-url ${baseURL}`))) {
        fail(`cli.json ${action}.${platform} must use the same profile and API base URL`);
      }
    }
    if (!config.auth[platform].includes("--no-browser") || !config.auth[platform].includes("--force")) {
      fail(`cli.json auth.${platform} must open a fresh authorization through WorkBuddy`);
    }
    if (!config.status[platform].includes("--output json") || config.status[platform].includes("--verify")) {
      fail(`cli.json status.${platform} must inspect local JSON state without refreshing`);
    }
  }
}

function validateIcon(iconPath) {
  const icon = fs.readFileSync(iconPath, "utf8");
  if (!/<svg\b/i.test(icon)) {
    fail("icon.svg must contain an svg element");
  }
  if (!/viewBox=["']0 0 64 64["']/.test(icon)) {
    fail("icon.svg must use viewBox 0 0 64 64");
  }
  const disallowed = [
    [/<script\b/i, "script tag"],
    [/<foreignObject\b/i, "foreignObject tag"],
    [/@import/i, "CSS import"],
    [/url\s*\(\s*["']?(?!#)/i, "external CSS url() reference"],
    [/\b(?:href|src|xlink:href)\s*=\s*["'][^"']*(?:https?:|data:)/i, "remote or embedded href/src"]
  ];
  for (const [pattern, label] of disallowed) {
    if (pattern.test(icon)) {
      fail(`icon.svg must not contain ${label}`);
    }
  }
}

function validateSkill(skillPath) {
  const text = fs.readFileSync(skillPath, "utf8");
  if (!/^---\n/.test(text)) {
    fail("WorkBuddy SKILL.md should include frontmatter");
  }
  for (const required of ["WorkBuddy", "patchxnote_get_current_user", "patchxnote_list_memories", "{\"platform\":\"mobile\",\"limit\":5}"]) {
    if (!text.includes(required)) {
      fail(`WorkBuddy SKILL.md must mention ${required}`);
    }
  }
}

function validateSensitiveContent(connectorRoot) {
  const patterns = [
    [/Bearer\s+[A-Za-z0-9._~+/-]{20,}/i, "bearer token"],
    [/\baccess_token\b\s*[:=]\s*["'][^"']{12,}["']/i, "access token value"],
    [/\brefresh_token\b\s*[:=]\s*["'][^"']{12,}["']/i, "refresh token value"],
    [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
    [/\bsk-[A-Za-z0-9]{20,}\b/, "provider key"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
    [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/, "JWT"],
    [/(?:\+?86[- ]?)?1[3-9]\d{9}\b/, "raw China mobile phone number"],
    [/C:\\Users\\/i, "Windows local user path"],
    [/\\\\wsl\.localhost\\/i, "WSL UNC local path"],
    [/\/home\/[A-Za-z0-9._-]+\//, "Linux local home path"]
  ];
  for (const { relativePath, text } of readTextPackageFiles(connectorRoot)) {
    for (const [pattern, label] of patterns) {
      if (pattern.test(text)) {
        fail(`${relativePath} appears to contain ${label}`);
      }
    }
  }
}

function validateNoUnexpectedFiles(connectorRoot) {
  assertNoFile(connectorRoot, "token-schema.json");
  const forbiddenNames = new Set([".git", "node_modules", "dist", ".env", ".patchnote"]);
  for (const filePath of walkFiles(connectorRoot)) {
    const relativeParts = path.relative(connectorRoot, filePath).split(path.sep);
    for (const part of relativeParts) {
      if (forbiddenNames.has(part)) {
        fail(`forbidden package path segment: ${relativeParts.join("/")}`);
      }
    }
  }
}

function readZipEntries(zipPath) {
  const buffer = fs.readFileSync(zipPath);
  let eocdOffset = -1;
  const searchStart = Math.max(0, buffer.length - 22 - 0xffff);
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) !== 0x06054b50) {
      continue;
    }
    const commentLength = buffer.readUInt16LE(offset + 20);
    if (offset + 22 + commentLength === buffer.length) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) {
    fail("WorkBuddy zip is missing a valid end-of-central-directory record");
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (centralDirectoryOffset + centralDirectorySize > buffer.length) {
    fail("WorkBuddy zip central directory is out of bounds");
  }

  const entries = [];
  let offset = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      fail("WorkBuddy zip central directory contains an invalid file header");
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    entries.push(buffer.subarray(nameStart, nameEnd).toString("utf8"));
    offset = nameEnd + extraLength + commentLength;
  }
  if (offset !== centralDirectoryOffset + centralDirectorySize) {
    fail("WorkBuddy zip central directory length does not match its entries");
  }
  return entries;
}

function validateZipIfPresent(zipPath, connectorRoot) {
  if (!zipPath) {
    return;
  }
  const size = fs.statSync(zipPath).size;
  if (size > maxZipBytes) {
    fail(`WorkBuddy zip exceeds 20MB: ${size}`);
  }
  const entries = readZipEntries(zipPath);
  const expectedEntries = walkFiles(connectorRoot).map(file => path.relative(connectorRoot, file).split(path.sep).join("/"));
  const entrySet = new Set(entries);
  for (const expectedEntry of expectedEntries) {
    if (!entrySet.has(expectedEntry)) {
      fail(`WorkBuddy zip is missing expected root entry: ${expectedEntry}`);
    }
  }
  if (entries.length !== expectedEntries.length) {
    fail(`WorkBuddy zip must contain exactly ${expectedEntries.length} files, found ${entries.length}`);
  }
  const topLevel = new Set(entries.map(entry => entry.split("/")[0]));
  for (const expectedTopLevel of ["connector-meta.json", "mcp.json", "cli.json", "icon.svg", "skills"]) {
    if (!topLevel.has(expectedTopLevel)) {
      fail(`WorkBuddy zip top level is missing ${expectedTopLevel}`);
    }
  }
  if (topLevel.size !== 5) {
    fail(`WorkBuddy zip has unexpected top-level entries: ${[...topLevel].sort().join(", ")}`);
  }
  const forbiddenNames = new Set([".git", "node_modules", "dist", ".env", ".patchnote"]);
  for (const entry of entries) {
    const parts = entry.split("/");
    if (entry.endsWith("/") || entry.startsWith("/") || entry.includes("\\") || /^[A-Za-z]:/.test(entry) || parts.includes("..")) {
      fail(`WorkBuddy zip contains unsafe entry path: ${entry}`);
    }
    for (const part of parts) {
      if (forbiddenNames.has(part)) {
        fail(`WorkBuddy zip contains forbidden path segment: ${entry}`);
      }
    }
  }
}

export function validateWorkBuddyConnector({
  connectorRoot = defaultConnectorRoot,
  expectedURL = "https://freenote.patch-x.cn/mcp",
  expectedCLIVersion,
  zipPath
} = {}) {
  if (!fs.existsSync(connectorRoot) || !fs.statSync(connectorRoot).isDirectory()) {
    fail(`missing connector directory: ${path.relative(repoRoot, connectorRoot)}`);
  }
  const meta = readJSON(assertFile(connectorRoot, "connector-meta.json"));
  const mcpConfig = readJSON(assertFile(connectorRoot, "mcp.json"));
  const cliConfig = readJSON(assertFile(connectorRoot, "cli.json"));
  const iconPath = assertFile(connectorRoot, "icon.svg");
  const skillPath = assertFile(connectorRoot, path.join("skills", "patchxnote-mcp", "SKILL.md"));
  for (const reference of ["onboarding.md", "workflows.md", "troubleshooting.md", "security-and-evidence.md", "source-of-truth.md"]) {
    assertFile(connectorRoot, path.join("skills", "patchxnote-mcp", "references", reference));
  }
  validateConnectorMeta(meta);
  const cliContract = validateMCPConfig(mcpConfig, expectedURL, expectedCLIVersion);
  validateCLIConfig(cliConfig, cliContract);
  validateIcon(iconPath);
  validateSkill(skillPath);
  validateNoUnexpectedFiles(connectorRoot);
  validateSensitiveContent(connectorRoot);
  validateZipIfPresent(zipPath, connectorRoot);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) fail("Usage: node scripts/validate-workbuddy-connector.mjs <generated-bundle-directory> [mcp-url]");
    validateWorkBuddyConnector({ connectorRoot: path.resolve(process.argv[2]), expectedURL: process.argv[3] ?? "https://freenote.patch-x.cn/mcp" });
    console.log("WorkBuddy connector validation passed");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
