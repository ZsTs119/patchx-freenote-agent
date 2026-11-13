import fs from "node:fs";
import zlib from "node:zlib";

export function bootstrapArgs(source, options, action, args = []) {
  const compressed = zlib.brotliCompressSync(Buffer.from(source), {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }
  }).toString("base64");
  const loader = "const b=require('node:zlib').brotliDecompressSync(Buffer.from('" + compressed +
    "','base64')).toString();const m={exports:{}};new Function('module','require',b)(m,require);" +
    "m.exports.main(process.argv.slice(1)).catch(e=>{console.error('[PatchX Freenote] '+e.message);process.exitCode=1})";
  return ["-e", loader, "--", action, Buffer.from(JSON.stringify(options)).toString("base64"), ...args];
}
export function bootstrapCommand(args) {
  // Generated arguments contain no shell substitutions; quote each independently.
  const command = "node " + args.map(arg => '"' + arg.replaceAll('"', '\\"') + '"').join(" ");
  if (command.length > 8000) throw new Error("WorkBuddy bootstrap command exceeds Windows command length");
  return command;
}
export const runtimeActions = {
  init: ["prepare", []],
  auth: ["run", ["login", "--no-browser", "--force", "--callback-timeout", "5m"]],
  status: ["run", ["status", "--output", "json"]],
  unAuth: ["run", ["logout"]],
  check: ["check", []]
};
export function renderWorkBuddyBootstrap(cli, mcp, { sourcePath, serverBaseURL, channel = "latest" }) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const options = { channel, profile: "workbuddy", serverBaseURL };
  for (const [action, [mode, args]] of Object.entries(runtimeActions)) {
    const command = bootstrapCommand(bootstrapArgs(source, options, mode, args));
    const commands = { darwin: command, linux: command, win32: command };
    if (action === "check") cli.versionCheck.command = commands;
    else cli[action] = commands;
  }
  const server = Object.values(mcp.mcpServers)[0];
  server.command = "node";
  server.args = bootstrapArgs(source, options, "run", ["serve"]);
  return { cli, mcp };
}

