#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createZipFromDirectory } from "./lib/package-zip.mjs";
import { validateWorkBuddyConnector } from "./validate-workbuddy-connector.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(repoRoot, "dist", "channels");

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(repoRoot, relativePath));
}

function parseJSON(content, label) {
  try {
    return JSON.parse(content.toString("utf8"));
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function jsonBuffer(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function brandText(text, branding) {
  // Display copy only; lowercase CLI, npm, MCP and OAuth identifiers stay intact.
  return text.replaceAll("PatchXNote Agent", branding.displayName)
    .replaceAll("PatchXNote", branding.displayName);
}

function brandJSON(value, branding) {
  return JSON.parse(JSON.stringify(value, (_key, item) =>
    typeof item === "string" ? brandText(item, branding) : item));
}

function inside(parent, relativePath) {
  const target = path.resolve(parent, relativePath);
  const relative = path.relative(parent, target);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Output path must stay inside ${parent}: ${relativePath}`);
  }
  return target;
}

function collectFiles(directory, prefix = "") {
  const files = new Map();
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if ([".DS_Store", "Thumbs.db"].includes(entry.name)) continue;
    const name = path.posix.join(prefix, entry.name);
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const [child, content] of collectFiles(source, name)) files.set(child, content);
    } else if (entry.isFile()) {
      files.set(name, fs.readFileSync(source));
    }
  }
  return files;
}

function render(content, environment, environmentName, version) {
  return Buffer.from(content.toString("utf8")
    .replaceAll("{{API_BASE_URL}}", environment.apiBaseURL)
    .replaceAll("{{MCP_URL}}", environment.mcpURL)
    .replaceAll("{{ENVIRONMENT}}", environmentName)
    .replaceAll("{{PACKAGE_VERSION}}", version));
}

function buildSkill(common, channel, environment, environmentName, version) {
  const files = collectFiles(path.resolve(repoRoot, common.skillSource));
  for (const [destination, source] of Object.entries(channel.skillOverrides ?? {})) {
    files.set(destination, render(readSource(source), environment, environmentName, version));
  }
  // Reuse the hosted connector SOP while allowing an explicit channel label.
  for (const [name, content] of files) {
    if (!name.endsWith(".md")) continue;
    let text = content.toString("utf8").replaceAll("{{CONNECTOR_SOURCE}}", channel.connectorSource ?? "");
    for (const [from, to] of Object.entries(channel.skillReplacements ?? {})) text = text.replaceAll(from, to);
    files.set(name, Buffer.from(text));
  }
  // Only explicitly selected test plugin packages need different onboarding
  // and server flags; channel branding is applied to the generated copy later.
  if (channel.format === "skill-plugin" && environment.localOnboarding) {
    files.set("references/onboarding.md", render(readSource(environment.localOnboarding), environment, environmentName, version));
    const scope = `This package targets ${environmentName}: ${environment.apiBaseURL}. Follow references/onboarding.md for this connection; retain the explicit server address in MCP startup configuration. Installing a Skill does not change existing configuration.\n\n`;
    let skill = files.get("SKILL.md").toString("utf8");
    skill = skill.replace(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/, `$1\n${scope}`);
    for (const command of ["setup --client <client-id>", "mcp config", "mcp status --verify"]) {
      skill = skill.replaceAll(`npx -y patchxnote-agent@latest ${command}`, `npx -y patchxnote-agent@latest ${command} --server-base-url ${environment.apiBaseURL}`);
    }
    files.set("SKILL.md", Buffer.from(skill));
    const sourceOfTruth = files.get("references/source-of-truth.md").toString("utf8");
    files.set("references/source-of-truth.md", Buffer.from(`Selected package environment: ${environmentName}. Use ${environment.apiBaseURL} and ${environment.mcpURL} for this connection. Production links below identify the public service, not this test connection.\n\n${sourceOfTruth}`));
  }
  for (const required of ["SKILL.md", "references/onboarding.md", "references/workflows.md", "references/troubleshooting.md", "references/security-and-evidence.md", "references/source-of-truth.md"]) {
    if (!files.has(required)) throw new Error(`Missing Skill file: ${required}`);
  }
  return files;
}

function validatePlugin(bundle, pluginRoot, channel, expectedManifest, skillDestination) {
  const manifest = parseJSON(fs.readFileSync(path.join(pluginRoot, channel.manifestDestination)), channel.manifestDestination);
  const marketplace = parseJSON(fs.readFileSync(path.join(bundle, channel.marketplace)), channel.marketplace);
  const entry = marketplace.plugins?.find(plugin => plugin.name === manifest.name);
  const source = typeof entry?.source === "string" ? entry.source : entry?.source?.path;
  if (!source || inside(bundle, source) !== pluginRoot) {
    throw new Error("Marketplace source must resolve to the generated plugin directory");
  }
  if (manifest.name !== expectedManifest.name || manifest.version !== expectedManifest.version) {
    throw new Error("Generated plugin identity/version differs from the selected package");
  }
  if (manifest.mcpServers || manifest.apps) throw new Error("This channel distributes the existing Skill-only plugin");
  const skillsPath = inside(pluginRoot, manifest.skills ?? "skills");
  if (!fs.statSync(skillsPath).isDirectory()) throw new Error("Plugin skills directory is missing");
  if (!fs.existsSync(path.join(pluginRoot, skillDestination, "SKILL.md"))) throw new Error("Plugin SKILL.md is missing");
}

function validateAgentPlugin(bundle, environment, packageFiles, maxBytes) {
  const manifest = parseJSON(fs.readFileSync(path.join(bundle, "plugin.json")), "plugin.json");
  const mcp = parseJSON(fs.readFileSync(path.join(bundle, "mcp.json")), "mcp.json");
  if (manifest.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json" ||
      mcp.$schema !== "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json") {
    throw new Error("Agent Plugins package must declare the matching 1.0.0 schemas");
  }
  const servers = Object.values(mcp.mcpServers ?? {});
  if (servers.length !== 1 || servers[0].type !== "streamable-http" || servers[0].url !== environment.mcpURL) {
    throw new Error("Agent Plugins MCP must use streamable-http and the selected endpoint");
  }
  const bytes = [...packageFiles.values()].reduce((sum, content) => sum + content.length, 0);
  if (bytes >= maxBytes) throw new Error(`Uncompressed package exceeds the channel size limit: ${bytes}`);
}

function main() {
  const { values } = parseArgs({
    options: {
      channel: { type: "string" },
      env: { type: "string", default: "production" },
      help: { type: "boolean", short: "h" }
    },
    allowPositionals: false
  });
  const config = parseJSON(readSource("packages/distribution/channels.json"), "channels.json");
  if (values.help) {
    console.log(`Usage: node scripts/package-channel.mjs --channel <${Object.keys(config.channels).join("|")}> [--env ${Object.keys(config.environments).join("|")}]\n\nDefaults to production. Creates platform materials under dist/channels/<channel>/<env>/<version>/.\nThis command does not install, authenticate, publish or change source files.`);
    return;
  }
  if (!values.channel || !Object.hasOwn(config.channels, values.channel)) {
    throw new Error(`Unknown or missing channel: ${values.channel ?? "(missing)"}. Use --help for supported channels.`);
  }
  if (!Object.hasOwn(config.environments, values.env)) throw new Error(`Unknown environment: ${values.env}`);
  const channel = config.channels[values.channel];
  const environment = config.environments[values.env];
  if (!["workbuddy-zip", "skill-plugin", "agent-plugin-zip"].includes(channel.format)) throw new Error(`Unsupported package format: ${channel.format}`);
  const branding = config.common.branding;
  const sourceManifest = parseJSON(readSource(channel.manifest), channel.manifest);
  const manifest = brandJSON(sourceManifest, branding);
  if (channel.format === "workbuddy-zip") manifest.source = channel.connectorSource ?? manifest.source;
  else manifest.name = branding.pluginName;
  if (!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(manifest.version ?? "")) throw new Error("Channel manifest must provide a package version");
  const skill = buildSkill(config.common, channel, environment, values.env, manifest.version);
  const packageFiles = new Map([[channel.manifestDestination, jsonBuffer(manifest)]]);
  for (const [destination, source] of Object.entries(channel.files ?? {})) packageFiles.set(destination, readSource(source));
  for (const [name, content] of skill) packageFiles.set(path.posix.join(config.common.skillDestination, name), content);
  for (const [name, content] of packageFiles) {
    if ([".md", ".svg"].includes(path.posix.extname(name))) {
      packageFiles.set(name, Buffer.from(brandText(content.toString("utf8"), branding)));
    }
  }

  let marketplace;
  let pluginDirectory;
  if (channel.format !== "skill-plugin") {
    const mcp = parseJSON(packageFiles.get("mcp.json"), "mcp.json");
    const servers = Object.values(mcp.mcpServers ?? {});
    if (servers.length !== 1) throw new Error("Remote plugin must configure exactly one MCP server");
    servers[0].url = environment.mcpURL;
    packageFiles.set("mcp.json", jsonBuffer(mcp));
  } else {
    pluginDirectory = path.posix.join(path.posix.dirname(channel.pluginDirectory), branding.pluginName);
    const listing = brandJSON(parseJSON(readSource(channel.marketplace), channel.marketplace), branding);
    const entry = listing.plugins?.find(plugin => plugin.name === sourceManifest.name);
    if (!entry) throw new Error("Marketplace is missing the source plugin entry");
    listing.name = branding.pluginName;
    entry.name = manifest.name;
    if (typeof entry.source === "string") entry.source = `./${pluginDirectory}`;
    else entry.source.path = `./${pluginDirectory}`;
    marketplace = jsonBuffer(listing);
  }

  // Load all inputs before touching this output; rebuilding one package leaves
  // all other channels, environments and versions intact.
  const outDir = inside(outputRoot, path.join(values.channel, values.env, manifest.version));
  const bundle = inside(outDir, "bundle");
  const pluginRoot = channel.format === "skill-plugin" ? inside(bundle, pluginDirectory) : bundle;
  const outputFiles = new Map();
  for (const [name, content] of packageFiles) outputFiles.set(inside(pluginRoot, name), content);
  if (marketplace) outputFiles.set(inside(bundle, channel.marketplace), marketplace);
  const archiveName = channel.archiveName?.replaceAll("{{DISPLAY_NAME}}", branding.displayName);
  const zipPath = channel.format !== "skill-plugin" ? inside(outDir, `${archiveName}-${manifest.version}.zip`) : null;
  fs.rmSync(outDir, { recursive: true, force: true });
  for (const [destination, content] of outputFiles) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
  }
  if (zipPath) {
    if (channel.format === "agent-plugin-zip") validateAgentPlugin(bundle, environment, packageFiles, channel.maxPackageBytes);
    createZipFromDirectory(bundle, zipPath);
    if (channel.format === "workbuddy-zip") {
      validateWorkBuddyConnector({ connectorRoot: bundle, expectedURL: environment.mcpURL, zipPath });
    } else if (fs.statSync(zipPath).size >= channel.maxPackageBytes) {
      throw new Error("ZIP exceeds the channel size limit");
    }
  } else {
    validatePlugin(bundle, pluginRoot, channel, manifest, config.common.skillDestination);
  }
  console.log(JSON.stringify({
    channel: values.channel,
    environment: values.env,
    version: manifest.version,
    artifact: path.relative(repoRoot, zipPath ?? bundle).split(path.sep).join("/")
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`Channel package failed: ${error.message}`);
  process.exitCode = 1;
}
