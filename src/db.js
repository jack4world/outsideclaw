const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

function defaultDbPath() {
  const home = os.homedir();
  return path.join(home, ".outsideclaw", "outsideclaw.sqlite");
}

function resolveDbPath() {
  const p = process.env.OUTSIDECLAW_DB || defaultDbPath();
  const dir = path.dirname(p);
  fs.mkdirSync(dir, { recursive: true });
  return p;
}

function openDb(dbPath = resolveDbPath()) {
  const db = new DatabaseSync(dbPath);
  // Pragmas for durability vs performance (safe defaults)
  db.exec("PRAGMA journal_mode=WAL;");
  db.exec("PRAGMA synchronous=NORMAL;");
  db.exec("PRAGMA foreign_keys=ON;");
  return db;
}

function migrate(db) {
  // Fresh installs will create latest schema. For existing DBs, apply lightweight ALTER migrations.
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const cur = db.prepare("SELECT value FROM meta WHERE key='schema_version'").get()?.value;
  const curVer = cur ? Number(cur) : 0;

  // Base schema (v1)
  db.exec(`
    CREATE TABLE IF NOT EXISTS routes (
      route_id TEXT PRIMARY KEY,
      name TEXT,
      source TEXT,
      canonical_hash TEXT NOT NULL,
      source_type TEXT NOT NULL,
      points_simplified_json TEXT NOT NULL,
      bbox_json TEXT,
      stats_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_routes_hash ON routes(canonical_hash);

    CREATE TABLE IF NOT EXISTS tracks (
      track_id TEXT PRIMARY KEY,
      route_id TEXT,
      started_at TEXT,
      ended_at TEXT,
      points_json TEXT NOT NULL,
      distance_m REAL,
      elev_gain_m_est REAL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(route_id) REFERENCES routes(route_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      route_id TEXT,
      mode TEXT,
      last_idx INTEGER,
      last_lat REAL,
      last_lon REAL,
      state_json TEXT,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(route_id) REFERENCES routes(route_id)
    );
  `);

  // v2: ensure session planning fields + track_points + risk_events exist
  // We run these idempotently (ALTERs are wrapped) because schema_version may be out of sync with actual columns.
  {
    const alters = [
      "ALTER TABLE sessions ADD COLUMN people_count INTEGER",
      "ALTER TABLE sessions ADD COLUMN water_plan_l REAL",
      "ALTER TABLE sessions ADD COLUMN start_time TEXT",
      "ALTER TABLE sessions ADD COLUMN hard_cutoff_time TEXT",
      "ALTER TABLE sessions ADD COLUMN record_on INTEGER DEFAULT 0",
    ];
    for (const sql of alters) {
      try {
        db.exec(sql + ";");
      } catch {
        // ignore (column already exists)
      }
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS track_points (
        session_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        ts TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        alt REAL,
        accuracy_m REAL,
        PRIMARY KEY(session_id, seq),
        FOREIGN KEY(session_id) REFERENCES sessions(session_id)
      );

      CREATE TABLE IF NOT EXISTS risk_events (
        event_id TEXT PRIMARY KEY,
        session_id TEXT,
        ts TEXT NOT NULL,
        type TEXT NOT NULL,
        level TEXT,
        message TEXT,
        payload_json TEXT,
        FOREIGN KEY(session_id) REFERENCES sessions(session_id)
      );

      CREATE INDEX IF NOT EXISTS idx_track_points_ts ON track_points(session_id, ts);
      CREATE INDEX IF NOT EXISTS idx_risk_events_ts ON risk_events(session_id, ts);
    `);

    const stmt = db.prepare("INSERT OR REPLACE INTO meta(key,value) VALUES('schema_version', ?)");
    stmt.run("2");
  }
}

module.exports = {
  defaultDbPath,
  resolveDbPath,
  openDb,
  migrate,
};
