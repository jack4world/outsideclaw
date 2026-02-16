// Recommend one route (plus one backup) from multiple imported routes.
// Phase A: deterministic scoring + hard filters.
// Usage:
//   node scripts/recommend.js --routes r1_a,r1_b,r1_c [--mode day_hike] [--time 6] [--water 2.5] [--people 2]

const { routeFeature } = require("../src/recommend/features");
const { scoreRoute } = require("../src/recommend/score");

function parseArgs(argv) {
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
    }
  }
  return flags;
}

const flags = parseArgs(process.argv);
const routesStr = String(flags.routes || "");
if (!routesStr) {
  console.error("Usage: node scripts/recommend.js --routes r1_a,r1_b [--mode day_hike] [--time 6] [--water 2.5] [--people 2]");
  process.exit(1);
}

const ctx = {
  mode: String(flags.mode || "day_hike"),
  timeLimitH: Number(flags.time || 6),
  waterPlanL: flags.water != null ? Number(flags.water) : null,
  peopleCount: flags.people != null ? Number(flags.people) : null,
};

const routeIds = routesStr.split(",").map((s) => s.trim()).filter(Boolean);
const rows = [];
for (const rid of routeIds) {
  try {
    const f = routeFeature(rid);
    const s = scoreRoute(f, ctx);
    rows.push({ ...f, ...s });
  } catch (e) {
    rows.push({ routeId: rid, error: String(e?.message || e) });
  }
}

const ok = rows.filter((r) => !r.error);
const rejected = ok.filter((r) => (r.hard || []).length);
const candidates = ok.filter((r) => !(r.hard || []).length);

candidates.sort((a, b) => b.score - a.score);

const primary = candidates[0] || null;
const backup = candidates[1] || null;

const out = {
  ctx,
  primary: primary ? { routeId: primary.routeId, score: primary.score, name: primary.name, reason: primary.breakdown } : null,
  backup: backup ? { routeId: backup.routeId, score: backup.score, name: backup.name, reason: backup.breakdown } : null,
  table: candidates.map((r) => ({ routeId: r.routeId, name: r.name, score: r.score, breakdown: r.breakdown })),
  rejected: rejected.map((r) => ({ routeId: r.routeId, name: r.name, hard: r.hard })),
  errors: rows.filter((r) => r.error),
};

process.stdout.write(JSON.stringify(out, null, 2) + "\n");
