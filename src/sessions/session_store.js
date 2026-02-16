const crypto = require("node:crypto");

function nowIso() {
  return new Date().toISOString();
}

function createSession(db, { routeId, mode = "day_hike", peopleCount = null, waterPlanL = null, hardCutoffTime = null, recordOn = 0 } = {}) {
  const sessionId = crypto.randomUUID();
  const createdAt = nowIso();
  const updatedAt = createdAt;
  const stmt = db.prepare(`
    INSERT INTO sessions(
      session_id, route_id, mode, people_count, water_plan_l, start_time, hard_cutoff_time, record_on,
      last_idx, last_lat, last_lon, state_json, updated_at, created_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  stmt.run(
    sessionId,
    routeId || null,
    mode,
    peopleCount,
    waterPlanL,
    createdAt,
    hardCutoffTime,
    recordOn ? 1 : 0,
    null,
    null,
    null,
    JSON.stringify({}),
    updatedAt,
    createdAt
  );
  return { sessionId, createdAt };
}

function setRecordOn(db, sessionId, on) {
  const stmt = db.prepare("UPDATE sessions SET record_on=?, updated_at=? WHERE session_id=?");
  stmt.run(on ? 1 : 0, nowIso(), sessionId);
}

function stopSession(db, sessionId) {
  // for now just mark updated_at
  const stmt = db.prepare("UPDATE sessions SET updated_at=? WHERE session_id=?");
  stmt.run(nowIso(), sessionId);
}

function getSession(db, sessionId) {
  return db.prepare("SELECT * FROM sessions WHERE session_id=?").get(sessionId) || null;
}

module.exports = {
  createSession,
  setRecordOn,
  stopSession,
  getSession,
};
