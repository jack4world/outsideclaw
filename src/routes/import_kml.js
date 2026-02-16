const fs = require("node:fs");
const crypto = require("node:crypto");

// Minimal KML parser for 2bulu-style KML (gx:coord) and basic KML name.
// Produces: { name, points: [{lat,lon,alt}], start, end }

function parseKml(kmlText) {
  const name = (kmlText.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/) || [])[1] ||
    (kmlText.match(/<name>([^<]+)<\/name>/) || [])[1] ||
    "route";

  const re = /<gx:coord>\s*([0-9.+-]+)\s+([0-9.+-]+)\s+([0-9.+-]+)\s*<\/gx:coord>/g;
  let m;
  const pts = [];
  while ((m = re.exec(kmlText))) {
    pts.push({ lon: +m[1], lat: +m[2], alt: +m[3] });
  }

  if (pts.length < 2) {
    // fallback: <coordinates>lon,lat,alt ...</coordinates> (rare for tracks)
    const m2 = kmlText.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (m2) {
      const parts = m2[1]
        .trim()
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const s of parts) {
        const [lon, lat, alt] = s.split(",");
        if (lon && lat) pts.push({ lon: +lon, lat: +lat, alt: alt != null ? +alt : null });
      }
    }
  }

  if (pts.length < 2) throw new Error("KML parse failed: no track points");

  return {
    name,
    points: pts,
    start: pts[0],
    end: pts[pts.length - 1],
  };
}

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

function bboxOf(points) {
  let minLat = Infinity,
    minLon = Infinity,
    maxLat = -Infinity,
    maxLon = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }
  return { minLat, minLon, maxLat, maxLon };
}

function estimateStats(points) {
  let dist = 0;
  let gain = 0;
  let loss = 0;
  let maxAlt = -Infinity;
  for (let i = 1; i < points.length; i++) {
    dist += haversineM(points[i - 1], points[i]);
    const a0 = points[i - 1].alt;
    const a1 = points[i].alt;
    if (Number.isFinite(a0) && Number.isFinite(a1)) {
      const d = a1 - a0;
      if (d > 0) gain += d;
      else loss += -d;
      if (a1 > maxAlt) maxAlt = a1;
    }
  }
  const startAlt = points[0].alt;
  if (Number.isFinite(startAlt) && startAlt > maxAlt) maxAlt = startAlt;
  return {
    distance_m_est: Math.round(dist),
    elev_gain_m_est: Math.round(gain),
    elev_loss_m_est: Math.round(loss),
    max_alt_m: Number.isFinite(maxAlt) ? Math.round(maxAlt) : null,
  };
}

// Simplify by uniform downsampling over cumulative distance.
// Target: ~maxPoints points.
function simplifyByDistance(points, maxPoints = 600) {
  if (points.length <= maxPoints) return points;

  // compute cumulative distance
  const cum = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineM(points[i - 1], points[i]);
    cum.push(total);
  }

  const out = [];
  for (let k = 0; k < maxPoints; k++) {
    const target = (total * k) / (maxPoints - 1);
    // binary search
    let lo = 0,
      hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    out.push(points[lo]);
  }

  // ensure endpoints exact
  out[0] = points[0];
  out[out.length - 1] = points[points.length - 1];

  // dedupe consecutive identical
  const dedup = [out[0]];
  for (let i = 1; i < out.length; i++) {
    const a = dedup[dedup.length - 1];
    const b = out[i];
    if (a.lat === b.lat && a.lon === b.lon) continue;
    dedup.push(b);
  }
  return dedup;
}

// Base32 without padding (RFC4648 alphabet)
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32NoPad(buf) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function canonicalRouteJson({ sourceType, pointsSimplified }) {
  // keep only geometry
  return {
    v: 1,
    sourceType,
    points_simplified: pointsSimplified.map((p) => [
      +p.lat.toFixed(6),
      +p.lon.toFixed(6),
    ]),
  };
}

function computeRouteId(canonObj) {
  const canonStr = JSON.stringify(canonObj);
  const hash = crypto.createHash("sha256").update(canonStr).digest();
  const short = base32NoPad(hash).toLowerCase().slice(0, 16);
  const routeId = `r1_${short}`;
  const fullHex = crypto.createHash("sha256").update(canonStr).digest("hex");
  return { routeId, canonicalHashHex: fullHex };
}

function importKmlFromFile(kmlPath, opts = {}) {
  const text = fs.readFileSync(kmlPath, "utf8");
  const parsed = parseKml(text);
  const pointsSimplified = simplifyByDistance(parsed.points, opts.maxPoints || 600);
  const bbox = bboxOf(pointsSimplified);
  const stats = estimateStats(parsed.points);

  const canon = canonicalRouteJson({ sourceType: "kml", pointsSimplified });
  const { routeId, canonicalHashHex } = computeRouteId(canon);

  return {
    routeId,
    name: parsed.name,
    source: opts.source || "user",
    sourceType: "kml",
    canonicalHashHex,
    pointsSimplified,
    bbox,
    stats,
  };
}

module.exports = {
  importKmlFromFile,
};
