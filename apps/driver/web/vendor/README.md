# Vendored: maplibre-gl-js

- **Source**: https://unpkg.com/maplibre-gl@4/dist/
- **Version**: 4.7.1
- **License**: BSD-3-Clause (https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt)

Required by the `maplibre_gl` Flutter plugin's web implementation
(`maplibre_gl_web`). Vendored instead of loaded from a CDN in `index.html` so
the map doesn't depend on a third party's uptime/reachability at runtime.

To update: download the new `maplibre-gl.js`/`maplibre-gl.css` from
`https://unpkg.com/maplibre-gl@<version>/dist/` and replace these files,
keeping the version compatible with the pinned `maplibre_gl` package version
in `pubspec.yaml`.
