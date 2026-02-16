const { openDb, resolveDbPath } = require("../src/db");

const dbPath = resolveDbPath();
const db = openDb(dbPath);

const schemaVersion = db.prepare("SELECT value FROM meta WHERE key='schema_version'").get()?.value;
const routes = db.prepare("SELECT COUNT(1) AS c FROM routes").get()?.c;
const tracks = db.prepare("SELECT COUNT(1) AS c FROM tracks").get()?.c;
const sessions = db.prepare("SELECT COUNT(1) AS c FROM sessions").get()?.c;

console.log(JSON.stringify({ dbPath, schemaVersion: schemaVersion || null, counts: { routes, tracks, sessions } }, null, 2));
