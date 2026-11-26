# 3D icons

The site's chrome-and-crimson icons (`public/img/icons/`) are rendered offline with SceneKit on macOS.

- `icons.json` is the models: each icon is a list of parts in a 100x100 box (SVG-like coordinates). Parts are extruded SVG paths with rounded bevels, or spheres, cylinders, cones, tori and boxes. Materials: `chrome`, `crimson` (lacquer), `dark`. `facets` adds a mirror-ball surface.
- `icons3d.swift` is the renderer: a studio environment, physically based materials, and transparent PNG output.
- `export.swift` writes the web versions (AVIF plus a PNG fallback).

```bash
swiftc -O -o /tmp/icons3d icons3d.swift && /tmp/icons3d icons.json /tmp/icons 900
swiftc -O -o /tmp/export export.swift
for f in /tmp/icons/*.png; do /tmp/export "$f" "../../public/img/icons/$(basename "$f" .png)" 440; done
```
