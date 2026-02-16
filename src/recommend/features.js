const fs = require("node:fs");
const path = require("node:path");

const { routeFiles } = require("../routes/storage");

function haversineM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function estimateDistanceM(points) {
  let dist = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversineM(points[i - 1], points[i]);
  }
  return dist;
}

function estimateTimeHours(distanceM, elevGainM) {
  // Simple conservative model: flat 4 km/h + 600m ascent per hour penalty.
  const base = distanceM / 1000 / 4;
  const ascentPenalty = (Number(elevGainM || 0) / 600);
  return base + ascentPenalty;
}

function loadRoutepack(routeId) {
  const rf = routeFiles(routeId);
  const p = rf.routepackPath;
  if (!fs.existsSync(p)) throw new Error(`No routepack for ${routeId}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function routeFeature(routeId) {
  const rp = loadRoutepack(routeId);
  const pts = (rp.points_simplified || []).map((p) => ({ lat: Number(p.lat), lon: Number(p.lon) }));
  const distM = rp?.stats?.distance_m_est ?? (pts.length >= 2 ? Math.round(estimateDistanceM(pts)) : null);
  const gainM = rp?.stats?.elev_gain_m_est ?? null;
  const maxAltM = rp?.stats?.max_alt_m ?? null;
  const etaH = distM != null ? estimateTimeHours(distM, gainM) : null;

  return {
    routeId,
    name: rp.name || null,
    source: rp.source || null,
    sourceType: rp.sourceType || null,
    distance_m: distM,
    elev_gain_m: gainM,
    max_alt_m: maxAltM,
    eta_h_est: etaH != null ? Number(etaH.toFixed(2)) : null,
  };
}

module.exports = { routeFeature, estimateTimeHours };
