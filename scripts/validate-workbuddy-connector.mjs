#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const maxZipBytes = 20 * 1024 * 1024;
const iconNames = ["icon.svg", "icon.png"];

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

function validateConnectorMeta(meta, expectedURL) {
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
  if (typeof meta.minWorkbuddyVersion !== "string" || compareVersion(meta.minWorkbuddyVersion, "4.24.0") < 0) {
    fail("connector-meta.json minWorkbuddyVersion must support server-side OAuth (4.24.0 or later)");
  }
  if (meta.auth_mode !== "server-side" || meta.server_auth?.auth_type !== "mcp_oauth") {
    fail("connector-meta.json must use server-side OAuth with mcp_oauth dynamic registration");
  }
  const oauth = meta.server_auth.data?.mcp_oauth;
  if (oauth?.server_url !== expectedURL) {
    fail("connector-meta.json OAuth server_url must match the selected MCP URL");
  }
  for (const field of ["client_id", "client_secret", "redirect_uri"]) {
    if (field in oauth) fail(`connector-meta.json ${field} is assigned by dynamic registration, not the package`);
  }
}

function validateMCPConfig(config, expectedURL) {
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
  if ("preAuth" in config) {
    fail("mcp.json must not contain CLI preAuth");
  }
  if (server.type !== "streamableHttp" || server.url !== expectedURL || !server.url.startsWith("https://")) {
    fail("mcp.json must use streamableHttp and the selected HTTPS MCP URL");
  }
  for (const field of ["command", "args", "runtime", "env"]) {
    if (field in server) fail(`mcp.json remote server must not contain local ${field}`);
  }
}

function findIcon(connectorRoot) {
  const icons = iconNames.filter(name => fs.existsSync(path.join(connectorRoot, name)));
  if (icons.length !== 1) fail("WorkBuddy package must contain one icon.svg or icon.png");
  return assertFile(connectorRoot, icons[0]);
}

function validateIcon(iconPath) {
  if (path.extname(iconPath) === ".png") {
    const icon = fs.readFileSync(iconPath);
    if (icon.length < 33 || !icon.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) ||
        icon.readUInt32BE(8) !== 13 || icon.toString("ascii", 12, 16) !== "IHDR" ||
        icon.readUInt32BE(16) === 0 || icon.readUInt32BE(20) === 0) {
      fail("icon.png must contain a PNG image with non-zero dimensions");
    }
    return;
  }
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

function validateSkill(skillPath, packageVersion) {
  const text = fs.readFileSync(skillPath, "utf8");
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) {
    fail("WorkBuddy SKILL.md should include frontmatter");
  }
  const skillVersion = frontmatter[1].match(/^[ \t]+version:[ \t]*["']?([^"'\s]+)["']?[ \t]*$/m)?.[1];
  if (skillVersion !== `${packageVersion}-workbuddy`) {
    fail("WorkBuddy Skill version must match the connector version with the -workbuddy suffix");
  }
  for (const required of ["WorkBuddy", "patchxnote_get_current_user", "patchxnote_get_quota_summary",
    "patchxnote_list_memories", "patchxnote_render_webhook_message"]) {
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
    if (/\{\{[A-Z_]+\}\}/.test(text)) fail(`${relativePath} contains an unresolved template`);
    for (const [pattern, label] of patterns) {
      if (pattern.test(text)) {
        fail(`${relativePath} appears to contain ${label}`);
      }
    }
  }
}

function validateNoUnexpectedFiles(connectorRoot) {
  assertNoFile(connectorRoot, "cli.json");
  assertNoFile(connectorRoot, "token-schema.json");
  const roots = new Set(["connector-meta.json", "mcp.json", ...iconNames, "skills"]);
  for (const name of fs.readdirSync(connectorRoot)) {
    if (!roots.has(name)) fail(`unexpected file in WorkBuddy remote package: ${name}`);
  }
  const forbiddenNames = new Set([".git", "node_modules", "dist", ".env", ".patchnote"]);
  for (const filePath of walkFiles(connectorRoot)) {
    if ([".js", ".cjs", ".mjs"].includes(path.extname(filePath).toLowerCase())) {
      fail("WorkBuddy remote package must not include executable bootstrap scripts");
    }
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

function validateZipIfPresent(zipPath, connectorRoot, iconName) {
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
  for (const expectedTopLevel of ["connector-meta.json", "mcp.json", iconName, "skills"]) {
    if (!topLevel.has(expectedTopLevel)) {
      fail(`WorkBuddy zip top level is missing ${expectedTopLevel}`);
    }
  }
  if (topLevel.size !== 4) {
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
  connectorRoot,
  expectedURL = "https://freenote.patch-x.cn/mcp",
  zipPath
} = {}) {
  if (!connectorRoot) fail("Provide the generated WorkBuddy bundle directory");
  if (!fs.existsSync(connectorRoot) || !fs.statSync(connectorRoot).isDirectory()) {
    fail(`missing connector directory: ${path.relative(repoRoot, connectorRoot)}`);
  }
  const meta = readJSON(assertFile(connectorRoot, "connector-meta.json"));
  const mcpConfig = readJSON(assertFile(connectorRoot, "mcp.json"));
  const iconPath = findIcon(connectorRoot);
  const skillPath = assertFile(connectorRoot, path.join("skills", "patchxnote-mcp", "SKILL.md"));
  for (const reference of ["onboarding.md", "workflows.md", "troubleshooting.md", "security-and-evidence.md", "source-of-truth.md"]) {
    assertFile(connectorRoot, path.join("skills", "patchxnote-mcp", "references", reference));
  }
  validateConnectorMeta(meta, expectedURL);
  validateMCPConfig(mcpConfig, expectedURL);
  validateIcon(iconPath);
  validateSkill(skillPath, meta.version);
  validateNoUnexpectedFiles(connectorRoot);
  validateSensitiveContent(connectorRoot);
  validateZipIfPresent(zipPath, connectorRoot, path.basename(iconPath));
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
