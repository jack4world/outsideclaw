// Guide by routeId using stored artifacts (~/.outsideclaw/routes/<routeId>/route.geojson)
// Usage:
//   node scripts/guide.js <routeId> <lat> <lon> [lastIdx] \
//     [--alerts <alertsJsonPath>] [--state <stateJsonPath>] [--cooldown-sec <n>] [--radius-m <n>] \
//     [--wx on] [--mode day_hike|summit_camp|trail_run] [--tz Asia/Shanghai] [--wx-hours 6] \
//     [--wx-cache <cacheJsonPath>] [--wx-cache-sec <n>]
//
// It forwards args to the skill's guide_route.js.

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const { routeFiles } = require("../src/routes/storage");

function parseArgs(argv) {
  const pos = [];
  const rest = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      rest.push(a);
      const next = argv[i + 1];
      if (next != null && !next.startsWith("--")) {
        rest.push(next);
        i++;
      }
    } else {
      pos.push(a);
    }
  }
  return { pos, rest };
}

const { pos, rest } = parseArgs(process.argv);
const routeId = pos[0];
const lat = pos[1];
const lon = pos[2];
const lastIdx = pos[3];

if (!routeId || lat == null || lon == null) {
  console.error("Usage: node scripts/guide.js <routeId> <lat> <lon> [lastIdx] [--wx on] [--mode ...] [--alerts ...]");
  process.exit(1);
}

const files = routeFiles(routeId);
if (!fs.existsSync(files.geojsonPath)) {
  console.error(`E:NO_ROUTE_FILE ${files.geojsonPath}`);
  process.exit(2);
}

const skillGuide = path.join(__dirname, "..", "skills", "trail-nav-telegram", "scripts", "guide_route.mjs");
const args = [skillGuide, files.geojsonPath, String(lat), String(lon)];
if (lastIdx != null) args.push(String(lastIdx));
args.push(...rest);

const r = spawnSync(process.execPath, args, { stdio: "inherit" });
process.exit(r.status ?? 0);
