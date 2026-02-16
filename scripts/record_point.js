// Record one GPS point into track_points for a session
// Usage:
//   node scripts/record_point.js <sessionId> <lat> <lon> [--alt 12.3] [--acc 8] [--ts 2026-02-16T12:00:00Z]

const { openDb, migrate, resolveDbPath } = require("../src/db");
const { getSession } = require("../src/sessions/session_store");
const { addPoint } = require("../src/tracks/track_store");

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
const lat = Number(pos[1]);
const lon = Number(pos[2]);
if (!sessionId || !Number.isFinite(lat) || !Number.isFinite(lon)) {
  console.error("Usage: node scripts/record_point.js <sessionId> <lat> <lon> [--alt x] [--acc m] [--ts iso]");
  process.exit(1);
}

const alt = flags.alt != null ? Number(flags.alt) : null;
const acc = flags.acc != null ? Number(flags.acc) : null;
const ts = flags.ts != null ? String(flags.ts) : null;

const dbPath = resolveDbPath();
const db = openDb(dbPath);
migrate(db);

const sess = getSession(db, sessionId);
if (!sess) {
  console.error("E:NO_SESSION");
  process.exit(2);
}

const { seq } = addPoint(db, { sessionId, lat, lon, alt, accuracyM: acc, ts });

db.prepare("UPDATE sessions SET last_lat=?, last_lon=?, updated_at=? WHERE session_id=?").run(lat, lon, new Date().toISOString(), sessionId);

process.stdout.write(JSON.stringify({ ok: true, sessionId, seq, lat, lon, alt, acc, ts: ts || null, dbPath }, null, 2) + "\n");
