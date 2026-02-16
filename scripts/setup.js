// outsideclaw setup: init db + print next steps

const { openDb, migrate, resolveDbPath } = require("../src/db");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const dbPath = resolveDbPath();
const db = openDb(dbPath);
migrate(db);

const routesDir = process.env.OUTSIDECLAW_ROUTES_DIR || path.join(os.homedir(), ".outsideclaw", "routes");
fs.mkdirSync(routesDir, { recursive: true });

console.log("OK setup");
console.log(JSON.stringify({ dbPath, routesDir }, null, 2));
console.log("\nNext:");
console.log("- Import KML: npm run import:kml -- /path/to/route.kml");
console.log("- Import GPX: npm run import:gpx -- /path/to/route.gpx");
console.log("- Guide:      npm run guide -- <routeId> <lat> <lon> [lastIdx] --wx on --mode day_hike");
console.log("- Share:      npm run share:route -- <routeId>");
console.log("- Import pkg: npm run import:bundle -- /path/to/outsideclaw-route-*.tar.gz");
