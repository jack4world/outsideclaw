function nowIso() {
  return new Date().toISOString();
}

function nextSeq(db, sessionId) {
  const row = db.prepare("SELECT MAX(seq) AS m FROM track_points WHERE session_id=?").get(sessionId);
  const m = row && row.m != null ? Number(row.m) : -1;
  return m + 1;
}

function addPoint(db, { sessionId, lat, lon, alt = null, accuracyM = null, ts = null }) {
  const seq = nextSeq(db, sessionId);
  const stmt = db.prepare(
    "INSERT INTO track_points(session_id, seq, ts, lat, lon, alt, accuracy_m) VALUES(?,?,?,?,?,?,?)"
  );
  stmt.run(sessionId, seq, ts || nowIso(), lat, lon, alt, accuracyM);
  return { seq };
}

function listPoints(db, sessionId, limit = 5000) {
  return db
    .prepare("SELECT seq, ts, lat, lon, alt, accuracy_m FROM track_points WHERE session_id=? ORDER BY seq ASC LIMIT ?")
    .all(sessionId, limit);
}

module.exports = {
  addPoint,
  listPoints,
};
