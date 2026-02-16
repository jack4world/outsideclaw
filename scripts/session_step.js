// Session step: record a point, run guide, print outputs, and persist risk events.
// Usage:
//   node scripts/session_step.js <sessionId> <lat> <lon> [--alt x] [--acc m] [--ts iso] \
//     [--routeId <routeId>] [--lastIdx <n>] \
//     [--alerts <alertsJsonPath>] [--cooldown-sec <n>] [--radius-m <n>] \
//     [--wx on] [--mode day_hike|summit_camp|trail_run] [--tz Asia/Shanghai] [--wx-hours 6]
// Notes:
// - If session.record_on=0, it will still guide but won't write track_points unless you pass --force-record on.

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const { openDb, migrate, resolveDbPath } = require("../src/db");
const { getSession } = require("../src/sessions/session_store");
const { addPoint } = require("../src/tracks/track_store");
const { addRiskEvent } = require("../src/risk/risk_store");
const { routeFiles } = require("../src/routes/storage");

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
  console.error("Usage: node scripts/session_step.js <sessionId> <lat> <lon> [--wx on] [--mode day_hike] ...");
  process.exit(1);
}

const alt = flags.alt != null ? Number(flags.alt) : null;
const acc = flags.acc != null ? Number(flags.acc) : null;
const ts = flags.ts != null ? String(flags.ts) : null;
const forceRecord = flags["force-record"] === "on";

const dbPath = resolveDbPath();
const db = openDb(dbPath);
migrate(db);

const sess = getSession(db, sessionId);
if (!sess) {
  console.error("E:NO_SESSION");
  process.exit(2);
}

const routeId = String(flags.routeId || sess.route_id || "");
if (!routeId) {
  console.error("E:NO_ROUTE_ID");
  process.exit(3);
}

// record point if enabled
if (sess.record_on || forceRecord) {
  addPoint(db, { sessionId, lat, lon, alt, accuracyM: acc, ts });
}

db.prepare("UPDATE sessions SET last_lat=?, last_lon=?, updated_at=? WHERE session_id=?").run(lat, lon, new Date().toISOString(), sessionId);

// run guide using stored artifacts
const rf = routeFiles(routeId);
const skillGuide = path.join(__dirname, "..", "skills", "trail-nav-telegram", "scripts", "guide_route.mjs");

const args = [skillGuide, rf.geojsonPath, String(lat), String(lon)];
const lastIdx = flags.lastIdx != null ? String(flags.lastIdx) : sess.last_idx != null ? String(sess.last_idx) : null;
if (lastIdx != null) args.push(lastIdx);

// forward relevant flags
function pushFlag(name, val) {
  if (val == null) return;
  args.push(`--${name}`, String(val));
}

if (flags.alerts) pushFlag("alerts", flags.alerts);
if (flags["cooldown-sec"]) pushFlag("cooldown-sec", flags["cooldown-sec"]);
if (flags["radius-m"]) pushFlag("radius-m", flags["radius-m"]);

// weather
if (flags.wx) args.push("--wx", "on");
if (flags.mode) pushFlag("mode", flags.mode);
if (flags.tz) pushFlag("tz", flags.tz);
if (flags["wx-hours"]) pushFlag("wx-hours", flags["wx-hours"]);

// caches: store per-session to avoid collisions
args.push("--state", path.join(require("node:os").homedir(), ".outsideclaw", "sessions", sessionId + "_alert_state.json"));
args.push("--wx-cache", path.join(require("node:os").homedir(), ".outsideclaw", "sessions", sessionId + "_wx_cache.json"));

const r = spawnSync(process.execPath, args, { encoding: "utf8" });
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);

// Persist risk events (very lightweight parsing)
const lines = String(r.stdout || "").trim().split(/\n+/).filter(Boolean);
for (const line of lines) {
  if (line.startsWith("G ")) {
    // off-route detection from S
    const m = line.match(/\bS:(\d)/);
    if (m && m[1] === "1") {
      addRiskEvent(db, { sessionId, type: "OFF_ROUTE", level: "warn", message: line });
    }
  } else if (line.startsWith("ALERT ")) {
    addRiskEvent(db, { sessionId, type: "NODE_ALERT", level: "info", message: line });
  } else if (line.startsWith("WX ALERT:")) {
    addRiskEvent(db, { sessionId, type: "WX_ALERT", level: "warn", message: line });
  }
}

process.exit(r.status ?? 0);
