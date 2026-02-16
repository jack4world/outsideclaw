const crypto = require("node:crypto");

function nowIso() {
  return new Date().toISOString();
}

function addRiskEvent(db, { sessionId = null, type, level = null, message = null, payload = null, ts = null } = {}) {
  const eventId = crypto.randomUUID();
  const stmt = db.prepare(
    "INSERT INTO risk_events(event_id, session_id, ts, type, level, message, payload_json) VALUES(?,?,?,?,?,?,?)"
  );
  stmt.run(eventId, sessionId, ts || nowIso(), type, level, message, payload ? JSON.stringify(payload) : null);
  return { eventId };
}

module.exports = { addRiskEvent };
