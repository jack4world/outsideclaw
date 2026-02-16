const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function routesDir() {
  return process.env.OUTSIDECLAW_ROUTES_DIR || path.join(os.homedir(), ".outsideclaw", "routes");
}

function routeDir(routeId) {
  const dir = path.join(routesDir(), routeId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function routeFiles(routeId) {
  const dir = routeDir(routeId);
  return {
    dir,
    geojsonPath: path.join(dir, "route.geojson"),
    routepackPath: path.join(dir, "routepack.json"),
    metaPath: path.join(dir, "meta.json"),
  };
}

function toGeoJSONLineString(name, pointsSimplified) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name },
        geometry: {
          type: "LineString",
          coordinates: pointsSimplified.map((p) => [p.lon, p.lat]),
        },
      },
    ],
  };
}

function writeRouteArtifacts({ routeId, name, sourceType, source, canonicalHashHex, pointsSimplified, bbox, stats }) {
  const files = routeFiles(routeId);

  const geo = toGeoJSONLineString(name, pointsSimplified);
  fs.writeFileSync(files.geojsonPath, JSON.stringify(geo, null, 2), "utf8");

  const routepack = {
    routeId,
    name,
    source,
    sourceType,
    canonicalHashHex,
    points: pointsSimplified.length,
    bbox,
    stats,
    // store simplified geometry only (lat/lon)
    points_simplified: pointsSimplified.map((p) => ({ lat: p.lat, lon: p.lon })),
  };
  fs.writeFileSync(files.routepackPath, JSON.stringify(routepack, null, 2), "utf8");

  const meta = {
    routeId,
    name,
    source,
    sourceType,
    canonicalHashHex,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(files.metaPath, JSON.stringify(meta, null, 2), "utf8");

  return files;
}

module.exports = {
  routesDir,
  routeDir,
  routeFiles,
  writeRouteArtifacts,
};
