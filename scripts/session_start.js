// Start a hiking session (bind route + mode + recording)
// Usage:
//   node scripts/session_start.js <routeId> [--mode day_hike|summit_camp|trail_run] [--people 2] [--water 2.5] [--cutoff 2026-02-17T16:30:00+08:00] [--record on]

const { openDb, migrate, resolveDbPath } = require("../src/db");
const { createSession } = require("../src/sessions/session_store");

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
const routeId = pos[0];
if (!routeId) {
  console.error("Usage: node scripts/session_start.js <routeId> [--mode ...] [--record on]");
  process.exit(1);
}

const mode = String(flags.mode || "day_hike");
const peopleCount = flags.people != null ? Number(flags.people) : null;
const waterPlanL = flags.water != null ? Number(flags.water) : null;
const hardCutoffTime = flags.cutoff != null ? String(flags.cutoff) : null;
const recordOn = flags.record === "on" || flags.record === true ? 1 : 0;

const dbPath = resolveDbPath();
const db = openDb(dbPath);
migrate(db);

const { sessionId, createdAt } = createSession(db, { routeId, mode, peopleCount, waterPlanL, hardCutoffTime, recordOn });
process.stdout.write(JSON.stringify({ ok: true, sessionId, routeId, mode, recordOn: !!recordOn, createdAt, dbPath }, null, 2) + "\n");
