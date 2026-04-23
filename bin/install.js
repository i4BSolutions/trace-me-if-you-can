#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const PKG_ROOT = path.resolve(__dirname, "..");
const CLAUDE_HOME = path.join(os.homedir(), ".claude");
const COMMANDS_DST = path.join(CLAUDE_HOME, "commands");
const SKILLS_DST = path.join(CLAUDE_HOME, "skills");

const COMMANDS_SRC = path.join(PKG_ROOT, "commands");
const SKILLS_SRC = path.join(PKG_ROOT, "skills");

const COMMAND_PREFIX = "trace";
const SKILL_DIRS = ["trace-core"];

function listCommandFiles() {
  if (!fs.existsSync(COMMANDS_SRC)) return [];
  return fs
    .readdirSync(COMMANDS_SRC)
    .filter((f) => f.endsWith(".md") && (f === "trace.md" || f.startsWith(`${COMMAND_PREFIX}-`)));
}

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

function removeIfExists(p) {
  if (!fs.existsSync(p)) return false;
  fs.rmSync(p, { recursive: true, force: true });
  return true;
}

function install() {
  const commands = listCommandFiles();
  if (commands.length === 0) {
    console.error("error: no trace-* command files found in package. Bad package contents?");
    process.exit(1);
  }

  fs.mkdirSync(COMMANDS_DST, { recursive: true });
  fs.mkdirSync(SKILLS_DST, { recursive: true });

  const installed = [];
  for (const name of commands) {
    const dst = path.join(COMMANDS_DST, name);
    copyFile(path.join(COMMANDS_SRC, name), dst);
    installed.push(dst);
  }

  for (const skill of SKILL_DIRS) {
    const src = path.join(SKILLS_SRC, skill);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(SKILLS_DST, skill);
    removeIfExists(dst);
    copyDir(src, dst);
    installed.push(dst);
  }

  console.log("trace-me-if-you-can installed.");
  console.log("");
  for (const p of installed) console.log("  " + p.replace(os.homedir(), "~"));
  console.log("");
  console.log("Next steps:");
  console.log("  1. Restart Claude Code (or run /reload) so the new commands appear.");
  console.log("  2. In your project, run /trace-profile to bootstrap trace.md.");
  console.log("  3. Then /trace to sync to Notion.");
  console.log("");
  console.log("Re-run `npx trace-me-if-you-can-cc@latest` any time to update.");
}

function uninstall() {
  const removed = [];
  for (const name of listCommandFiles()) {
    const p = path.join(COMMANDS_DST, name);
    if (removeIfExists(p)) removed.push(p);
  }
  for (const skill of SKILL_DIRS) {
    const p = path.join(SKILLS_DST, skill);
    if (removeIfExists(p)) removed.push(p);
  }

  if (removed.length === 0) {
    console.log("Nothing to remove — no trace-me-if-you-can files found in ~/.claude.");
    return;
  }
  console.log("trace-me-if-you-can removed.");
  console.log("");
  for (const p of removed) console.log("  " + p.replace(os.homedir(), "~"));
  console.log("");
  console.log("Restart Claude Code to drop the /trace-* commands from the command list.");
}

function help() {
  console.log("trace-me-if-you-can-cc — installer for the trace-me-if-you-can Claude Code plugin");
  console.log("");
  console.log("Usage:");
  console.log("  npx trace-me-if-you-can-cc@latest             Install or update");
  console.log("  npx trace-me-if-you-can-cc@latest --uninstall Remove installed files");
  console.log("  npx trace-me-if-you-can-cc@latest --help      Show this help");
  console.log("");
  console.log("What it does:");
  console.log("  Copies /trace-* slash commands into ~/.claude/commands/");
  console.log("  Copies the trace-core skill into ~/.claude/skills/trace-core/");
  console.log("  User-level — available in every project, no per-project setup.");
}

const arg = process.argv[2];
if (arg === "--uninstall" || arg === "-u" || arg === "uninstall") uninstall();
else if (arg === "--help" || arg === "-h" || arg === "help") help();
else install();
