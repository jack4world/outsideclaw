// Import a shared route bundle (tar.gz) into outsideclaw
// Usage:
//   node scripts/import_bundle.js <bundle.tar.gz>
// Notes:
// - Extracts into ~/.outsideclaw/share/inbox/<bundleName>/
// - Reads manifest.json and writes route artifacts into ~/.outsideclaw/routes/<routeId>/
// - Upserts route into SQLite routes table.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { inboxDir } = require("../src/share/share_storage");
const { routeFiles } = require("../src/routes/storage");
const { openDb, migrate, resolveDbPath } = require("../src/db");

const bundlePath = process.argv[2];
if (!bundlePath || !fs.existsSync(bundlePath)) {
  console.error("Usage: node scripts/import_bundle.js <bundle.tar.gz>");
  process.exit(1);
}

const base = path.basename(bundlePath).replace(/\.tar\.gz$/i, "");
const extractDir = path.join(inboxDir(), base);
fs.mkdirSync(extractDir, { recursive: true });

const r = spawnSync("tar", ["-xzf", bundlePath, "-C", extractDir], { stdio: "inherit" });
if ((r.status ?? 0) !== 0) process.exit(r.status ?? 2);

const manifestPath = path.join(extractDir, "manifest.json");
if (!fs.existsSync(manifestPath)) {
  console.error("E:NO_MANIFEST");
  process.exit(3);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.kind !== "outsideclaw.route.bundle" || !manifest.routeId) {
  console.error("E:BAD_MANIFEST");
  process.exit(4);
}

const routeId = String(manifest.routeId);
const rf = routeFiles(routeId);

// Copy artifacts into routes/<routeId>/
for (const f of manifest.files || []) {
  const src = path.join(extractDir, f);
  if (!fs.existsSync(src)) continue;
  const dst = path.join(rf.dir, f);
  fs.copyFileSync(src, dst);
}

// Upsert DB route record using routepack.json
const routepackPath = path.join(rf.dir, "routepack.json");
if (!fs.existsSync(routepackPath)) {
  console.error("E:NO_ROUTEPACK");
  process.exit(5);
}

const rp = JSON.parse(fs.readFileSync(routepackPath, "utf8"));
const now = new Date().toISOString();

const dbPath = resolveDbPath();
const db = openDb(dbPath);
migrate(db);

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
  routeId,
  rp.name || null,
  rp.source || "shared",
  rp.canonicalHashHex || "",
  rp.sourceType || "unknown",
  JSON.stringify(rp.points_simplified || []),
  JSON.stringify(rp.bbox || null),
  JSON.stringify(rp.stats || null),
  now
);

process.stdout.write(JSON.stringify({ ok: true, routeId, dbPath, importedTo: rf.dir }, null, 2) + "\n");
