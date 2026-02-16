const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function shareDir() {
  return process.env.OUTSIDECLAW_SHARE_DIR || path.join(os.homedir(), ".outsideclaw", "share");
}

function outboxDir() {
  const dir = path.join(shareDir(), "outbox");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function inboxDir() {
  const dir = path.join(shareDir(), "inbox");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = { shareDir, outboxDir, inboxDir };
