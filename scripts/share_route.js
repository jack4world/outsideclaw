// Create a share bundle for a routeId (tar.gz)
// Bundle contains route artifacts: route.geojson, routepack.json, meta.json (+ optional alerts)
// Usage:
//   node scripts/share_route.js <routeId> [--alerts /path/to/alerts.json]
// Output:
//   Prints bundle path as JSON.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { routeFiles } = require("../src/routes/storage");
const { outboxDir } = require("../src/share/share_storage");

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
const routeId = pos[0];
if (!routeId) {
  console.error("Usage: node scripts/share_route.js <routeId> [--alerts /path/to/alerts.json]");
  process.exit(1);
}

const files = routeFiles(routeId);
if (!fs.existsSync(files.geojsonPath) || !fs.existsSync(files.routepackPath) || !fs.existsSync(files.metaPath)) {
  console.error("E:ROUTE_ARTIFACTS_MISSING", files);
  process.exit(2);
}

const bundleBase = `outsideclaw-route-${routeId}-${Date.now()}`;
const workDir = path.join(outboxDir(), bundleBase);
fs.mkdirSync(workDir, { recursive: true });

// Copy required artifacts
fs.copyFileSync(files.geojsonPath, path.join(workDir, "route.geojson"));
fs.copyFileSync(files.routepackPath, path.join(workDir, "routepack.json"));
fs.copyFileSync(files.metaPath, path.join(workDir, "meta.json"));

// Optional alerts
const alertsPath = typeof flags.alerts === "string" ? flags.alerts : null;
if (alertsPath && fs.existsSync(alertsPath)) {
  fs.copyFileSync(alertsPath, path.join(workDir, "alerts.json"));
}

// Manifest
const manifest = {
  kind: "outsideclaw.route.bundle",
  version: 1,
  routeId,
  createdAt: new Date().toISOString(),
  files: ["route.geojson", "routepack.json", "meta.json"].concat(alertsPath ? ["alerts.json"] : []),
};
fs.writeFileSync(path.join(workDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

// Pack
const tgzPath = path.join(outboxDir(), `${bundleBase}.tar.gz`);
const r = spawnSync("tar", ["-czf", tgzPath, "-C", workDir, "."], { stdio: "inherit" });
if ((r.status ?? 0) !== 0) process.exit(r.status ?? 3);

process.stdout.write(JSON.stringify({ routeId, bundle: tgzPath }, null, 2) + "\n");
