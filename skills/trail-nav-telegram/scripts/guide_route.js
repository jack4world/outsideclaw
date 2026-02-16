// Deterministic off-route guidance for a route polyline (GeoJSON LineString)
// Usage:
//   node guide_route.js <geojsonPath> <lat> <lon> [lastIdx]
// Output:
//   Two lines per references/guide-protocol.md
// Notes:
// - No LLM involved.
// - Works offline.

import fs from "node:fs";

const geojsonPath = process.argv[2];
const lat = Number(process.argv[3]);
const lon = Number(process.argv[4]);
const lastIdx = process.argv[5] != null ? Number(process.argv[5]) : null;

if (!geojsonPath || !Number.isFinite(lat) || !Number.isFinite(lon)) {
  console.error("Usage: node guide_route.js <geojsonPath> <lat> <lon> [lastIdx]");
  process.exit(1);
}

// Defaults (keep in sync with references/guide-protocol.md)
const toleranceM = 50;
const arrivedM = 60;
const lookaheadM = 120;
const bboxGuardM = 2000;
const windowHalf = 120; // for lastIdx window search

const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
function dir8(deg) {
  const i = Math.round((((deg % 360) + 360) % 360) / 45);
  return dirs[i];
}

// Great-circle distance (meters)
function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Approx local projection (meters) around lat0
function projectMeters(lat0, lon0, lat, lon) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const x = toRad(lon - lon0) * R * Math.cos(toRad(lat0));
  const y = toRad(lat - lat0) * R;
  return { x, y };
}

function unprojectMeters(lat0, lon0, x, y) {
  const R = 6371000;
  const toDeg = (r) => (r * 180) / Math.PI;
  const lat = lat0 + toDeg(y / R);
  const lon = lon0 + toDeg(x / (R * Math.cos((lat0 * Math.PI) / 180)));
  return { lat, lon };
}

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

function pointToSeg(lat0, lon0, p, a, b) {
  // Returns distance (m) from point p to segment a-b and closest point on segment.
  const P = projectMeters(lat0, lon0, p.lat, p.lon);
  const A = projectMeters(lat0, lon0, a.lat, a.lon);
  const B = projectMeters(lat0, lon0, b.lat, b.lon);

  const ABx = B.x - A.x;
  const ABy = B.y - A.y;
  const APx = P.x - A.x;
  const APy = P.y - A.y;
  const denom = ABx * ABx + ABy * ABy;
  const t = denom > 0 ? clamp01((APx * ABx + APy * ABy) / denom) : 0;
  const cx = A.x + t * ABx;
  const cy = A.y + t * ABy;
  const dx = P.x - cx;
  const dy = P.y - cy;
  const dist = Math.hypot(dx, dy);
  const C = unprojectMeters(lat0, lon0, cx, cy);
  return { dist, t, closest: C };
}

function loadLineString(path) {
  const j = JSON.parse(fs.readFileSync(path, "utf8"));
  let coords = null;
  if (j?.type === "FeatureCollection") coords = j?.features?.[0]?.geometry?.coordinates;
  else if (j?.type === "Feature") coords = j?.geometry?.coordinates;
  else if (j?.type === "LineString") coords = j?.coordinates;

  if (!Array.isArray(coords) || coords.length < 2) throw new Error("Invalid GeoJSON LineString");
  // [lon,lat] -> {lat,lon}
  return coords.map(([lo, la]) => ({ lat: +la, lon: +lo }));
}

function bboxOfLine(line) {
  let minLat = Infinity,
    minLon = Infinity,
    maxLat = -Infinity,
    maxLon = -Infinity;
  for (const p of line) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }
  return { minLat, minLon, maxLat, maxLon };
}

function distanceToBboxM(lat0, lon0, bbox, p) {
  // 0 if inside bbox, else distance to nearest point on bbox rectangle edges (approx in meters)
  const clampedLat = Math.max(bbox.minLat, Math.min(bbox.maxLat, p.lat));
  const clampedLon = Math.max(bbox.minLon, Math.min(bbox.maxLon, p.lon));
  return haversineM(p.lat, p.lon, clampedLat, clampedLon);
}

function findNearest(line, p, lastIdxMaybe) {
  const lat0 = p.lat;
  const lon0 = p.lon;

  const segCount = line.length - 1;
  let startSeg = 0;
  let endSeg = segCount - 1;
  if (Number.isFinite(lastIdxMaybe)) {
    const center = Math.max(0, Math.min(line.length - 1, lastIdxMaybe));
    startSeg = Math.max(0, center - windowHalf);
    endSeg = Math.min(segCount - 1, center + windowHalf);
  }

  function scan(s0, s1) {
    let best = { dist: Infinity, segIdx: 0, t: 0, closest: null };
    for (let i = s0; i <= s1; i++) {
      const r = pointToSeg(lat0, lon0, p, line[i], line[i + 1]);
      if (r.dist < best.dist) best = { ...r, segIdx: i };
    }
    return best;
  }

  let best = scan(startSeg, endSeg);
  if (best.dist === Infinity || best.dist > 2000) {
    // fallback to full scan if window miss or clearly far
    best = scan(0, segCount - 1);
  }

  // nearest "IDX" as nearest vertex index (seg start) for incremental usage
  const idx = best.segIdx;
  return { ...best, idx };
}

function pickLookaheadPoint(line, nearest, metersAhead) {
  // Start from nearest.closest projected onto seg segIdx at t; then walk forward
  const segIdx = nearest.segIdx;
  const t = nearest.t;

  // current point on route
  let cur = nearest.closest;

  // remaining on current segment
  let distLeft = metersAhead;

  // helper to measure along segment
  function segLen(i) {
    return haversineM(line[i].lat, line[i].lon, line[i + 1].lat, line[i + 1].lon);
  }

  // distance from projected point to end of current seg
  const segTotal = segLen(segIdx);
  const toEnd = (1 - t) * segTotal;
  if (toEnd >= distLeft) {
    // interpolate within current seg
    const tt = t + (distLeft / segTotal);
    const lat = line[segIdx].lat + (line[segIdx + 1].lat - line[segIdx].lat) * tt;
    const lon = line[segIdx].lon + (line[segIdx + 1].lon - line[segIdx].lon) * tt;
    return { lat, lon };
  }

  distLeft -= toEnd;
  for (let i = segIdx + 1; i < line.length - 1; i++) {
    const L = segLen(i);
    if (L >= distLeft) {
      const tt = distLeft / L;
      return {
        lat: line[i].lat + (line[i + 1].lat - line[i].lat) * tt,
        lon: line[i].lon + (line[i + 1].lon - line[i].lon) * tt,
      };
    }
    distLeft -= L;
  }

  return line[line.length - 1];
}

function roundInt(x) {
  return Math.round(x);
}

// --- main
const line = loadLineString(geojsonPath);
const bbox = bboxOfLine(line);
const me = { lat, lon };

const bboxDist = distanceToBboxM(lat, lon, bbox, me);
if (bboxDist > bboxGuardM) {
  console.log("E:OUT_OF_BBOX");
  process.exit(0);
}

const end = line[line.length - 1];
const distToEnd = haversineM(lat, lon, end.lat, end.lon);

const nearest = findNearest(line, me, lastIdx);
const D = nearest.dist;

let S = 1;
if (distToEnd <= arrivedM) S = 2;
else if (D <= toleranceM) S = 0;

let B = null;
let dir = null;
let GO = 0;

if (S === 2) {
  // arrived
  GO = 0;
} else if (S === 1) {
  // off-route: aim to closest point on route
  B = bearingDeg(lat, lon, nearest.closest.lat, nearest.closest.lon);
  dir = dir8(B);
  GO = roundInt(D);
} else {
  // on-route: aim to lookahead point
  const tgt = pickLookaheadPoint(line, nearest, lookaheadM);
  B = bearingDeg(lat, lon, tgt.lat, tgt.lon);
  dir = dir8(B);
  GO = lookaheadM;
}

const IDX = nearest.idx;

// line 1
if (S === 2) {
  console.log(`G S:${S} D:${roundInt(Math.min(D, distToEnd))} B:— GO:${GO} IDX:${IDX}`);
  console.log(`你已接近终点（${roundInt(distToEnd)}米内）。建议在此附近确认营地/下撤方向。`);
} else {
  console.log(`G S:${S} D:${roundInt(D)} B:${roundInt(B)}${dir} GO:${GO} IDX:${IDX}`);
  if (S === 0) {
    console.log(`在路线内（偏离${roundInt(D)}米）。朝${dir}（${roundInt(B)}°）前进约${GO}米。`);
  } else {
    console.log(`你已偏离路线约${roundInt(D)}米。请朝${dir}（${roundInt(B)}°）走约${GO}米回到路线。`);
  }
}
