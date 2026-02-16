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
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

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

  // mark schema version
  const stmt = db.prepare("INSERT OR REPLACE INTO meta(key,value) VALUES('schema_version', ?)");
  stmt.run("1");
}

module.exports = {
  defaultDbPath,
  resolveDbPath,
  openDb,
  migrate,
};
