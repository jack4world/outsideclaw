# Route ID scheme

outsideclaw uses **content-hash route IDs** to deduplicate repeated imports.

## Format
- `routeId = r1_<short>`
- `<short> = base32(sha256(canonicalRouteJson)).slice(0, 16)`

Example:
- `r1_k3p8s1m4v2n9q0ab`

## Canonical route JSON (for hashing)
Include only geometry-defining fields:
- `sourceType`: `kml|gpx|geojson`
- `points_simplified`: simplified polyline points (recommended 300–800 points)

Avoid including:
- import timestamps, names, author info
- original point count
- external URLs with volatile query params

## Versioning
Prefix `r1_` leaves room for future changes to canonicalization or simplification algorithms (`r2_...`).
