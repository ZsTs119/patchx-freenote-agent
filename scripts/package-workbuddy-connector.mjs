#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateWorkBuddyConnector } from "./validate-workbuddy-connector.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const connectorRoot = path.join(repoRoot, "packages", "workbuddy", "patchxnote-agent");
const outDir = path.join(repoRoot, "dist", "workbuddy");
const stageDir = path.join(outDir, "stage");
const stageRoot = path.join(stageDir, "patchxnote-workbuddy-connector");
const zipPath = path.join(outDir, "patchxnote-workbuddy-connector-0.1.0.zip");
const maxZipBytes = 20 * 1024 * 1024;

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  return {
    time: (hours << 11) | (minutes << 5) | seconds,
    date: ((year - 1980) << 9) | (month << 5) | day
  };
}

function assertInside(parent, target) {
  const relative = path.relative(parent, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`refusing to operate outside ${parent}: ${target}`);
  }
}

function removeControlledDirectory(target) {
  assertInside(outDir, target);
  fs.rmSync(target, { recursive: true, force: true });
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

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  const entries = fs.readdirSync(source, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function createZipFromDirectory(sourceRoot, outputPath) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const files = walkFiles(sourceRoot);
  for (const filePath of files) {
    const relativeName = path.relative(sourceRoot, filePath).split(path.sep).join("/");
    const nameBuffer = Buffer.from(relativeName, "utf8");
    const content = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);
    const stamp = dosDateTime(stats.mtime);
    const crc = crc32(content);
    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(stamp.time),
      u16(stamp.date),
      u32(crc),
      u32(content.length),
      u32(content.length),
      u16(nameBuffer.length),
      u16(0),
      nameBuffer
    ]);
    chunks.push(localHeader, content);
    central.push(Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(stamp.time),
      u16(stamp.date),
      u32(crc),
      u32(content.length),
      u32(content.length),
      u16(nameBuffer.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBuffer
    ]));
    offset += localHeader.length + content.length;
  }
  const centralOffset = offset;
  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const eocd = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(central.length),
    u16(central.length),
    u32(centralSize),
    u32(centralOffset),
    u16(0)
  ]);
  fs.writeFileSync(outputPath, Buffer.concat([...chunks, ...central, eocd]));
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  removeControlledDirectory(stageDir);
  assertInside(outDir, zipPath);
  fs.rmSync(zipPath, { force: true });
  validateWorkBuddyConnector();
  copyDirectory(connectorRoot, stageRoot);
  createZipFromDirectory(stageRoot, zipPath);
  const size = fs.statSync(zipPath).size;
  if (size > maxZipBytes) {
    throw new Error(`WorkBuddy zip exceeds 20MB: ${size}`);
  }
  validateWorkBuddyConnector();
  removeControlledDirectory(stageDir);
  console.log(JSON.stringify({
    artifact: path.relative(repoRoot, zipPath).split(path.sep).join("/"),
    bytes: size
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
