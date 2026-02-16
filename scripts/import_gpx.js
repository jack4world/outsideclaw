// Import a GPX file into outsideclaw SQLite routes table.
// Usage:
//   node scripts/import_gpx.js <gpxPath> [--source user] [--maxPoints 600]
// Output:
//   Prints routeId + basic stats as JSON.

const fs = require("node:fs");
const { openDb, migrate, resolveDbPath } = require("../src/db");
const { importGpxFromFile } = require("../src/routes/import_gpx");
const { writeRouteArtifacts } = require("../src/routes/storage");

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
const gpxPath = pos[0];
if (!gpxPath || !fs.existsSync(gpxPath)) {
  console.error("Usage: node scripts/import_gpx.js <gpxPath> [--source user] [--maxPoints 600]");
  process.exit(1);
}

const source = String(flags.source || "user");
const maxPoints = flags.maxPoints != null ? Number(flags.maxPoints) : 600;

const rec = importGpxFromFile(gpxPath, { source, maxPoints });

const dbPath = resolveDbPath();
const db = openDb(dbPath);
migrate(db);

const now = new Date().toISOString();
const stmt = db.prepare(`
  INSERT INTO routes(
    route_id, name, source, canonical_hash, source_type,
    points_simplified_json, bbox_json, stats_json, created_at
  ) VALUES(?,?,?,?,?,?,?,?,?)
  ON CONFLICT(route_id) DO UPDATE SET
    name=excluded.name,
    source=excluded.source,
    canonical_hash=excluded.canonical_hash,
    source_type=excluded.source_type,
    points_simplified_json=excluded.points_simplified_json,
    bbox_json=excluded.bbox_json,
    stats_json=excluded.stats_json
`);

stmt.run(
  rec.routeId,
  rec.name,
  rec.source,
  rec.canonicalHashHex,
  rec.sourceType,
  JSON.stringify(rec.pointsSimplified),
  JSON.stringify(rec.bbox),
  JSON.stringify(rec.stats),
  now
);

const files = writeRouteArtifacts({
  routeId: rec.routeId,
  name: rec.name,
  sourceType: rec.sourceType,
  source: rec.source,
  canonicalHashHex: rec.canonicalHashHex,
  pointsSimplified: rec.pointsSimplified,
  bbox: rec.bbox,
  stats: rec.stats,
});

process.stdout.write(
  JSON.stringify(
    {
      routeId: rec.routeId,
      name: rec.name,
      source: rec.source,
      dbPath,
      simplifiedPoints: rec.pointsSimplified.length,
      stats: rec.stats,
      bbox: rec.bbox,
      artifacts: files,
    },
    null,
    2
  ) + "\n"
);
