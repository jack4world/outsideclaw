// Stop a session (for now: mark updated_at; recording can be disabled)
// Usage:
//   node scripts/session_stop.js <sessionId> [--record off]

const { openDb, migrate, resolveDbPath } = require("../src/db");
const { getSession, setRecordOn, stopSession } = require("../src/sessions/session_store");

function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const n = argv[i + 1];
      if (n != null && !n.startsWith("--")) {
        flags[k] = n;
        i++;
      } else {
        flags[k] = true;
      }
    } else {
      pos.push(a);
    }
  }
  return { pos, flags };
}

const { pos, flags } = parseArgs(process.argv);
const sessionId = pos[0];
if (!sessionId) {
  console.error("Usage: node scripts/session_stop.js <sessionId>");
  process.exit(1);
}

const dbPath = resolveDbPath();
const db = openDb(dbPath);
migrate(db);

const sess = getSession(db, sessionId);
if (!sess) {
  console.error("E:NO_SESSION");
  process.exit(2);
}

if (flags.record === "off") setRecordOn(db, sessionId, false);
stopSession(db, sessionId);

process.stdout.write(JSON.stringify({ ok: true, sessionId, recordOn: flags.record === "off" ? false : !!sess.record_on, dbPath }, null, 2) + "\n");
