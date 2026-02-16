const { openDb, migrate, resolveDbPath } = require("../src/db");

const dbPath = resolveDbPath();
const db = openDb(dbPath);
migrate(db);
console.log("OK db:init", dbPath);
