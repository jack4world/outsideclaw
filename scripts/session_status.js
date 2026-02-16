// Show session status summary + latest points count
// Usage:
//   node scripts/session_status.js <sessionId>

const { openDb, migrate, resolveDbPath } = require("../src/db");
const { getSession } = require("../src/sessions/session_store");

const sessionId = process.argv[2];
if (!sessionId) {
  console.error("Usage: node scripts/session_status.js <sessionId>");
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

const count = db.prepare("SELECT COUNT(1) AS c FROM track_points WHERE session_id=?").get(sessionId)?.c;
const last = db.prepare("SELECT seq, ts, lat, lon, alt, accuracy_m FROM track_points WHERE session_id=? ORDER BY seq DESC LIMIT 1").get(sessionId) || null;

process.stdout.write(
  JSON.stringify(
    {
      dbPath,
      session: {
        sessionId: sess.session_id,
        routeId: sess.route_id,
        mode: sess.mode,
        recordOn: !!sess.record_on,
        peopleCount: sess.people_count,
        waterPlanL: sess.water_plan_l,
        startTime: sess.start_time,
        hardCutoffTime: sess.hard_cutoff_time,
        lastIdx: sess.last_idx,
        lastLat: sess.last_lat,
        lastLon: sess.last_lon,
        updatedAt: sess.updated_at,
        createdAt: sess.created_at,
      },
      points: { count: Number(count || 0), last },
    },
    null,
    2
  ) + "\n"
);
