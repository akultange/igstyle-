# The pictures of the 18+ door as a place (`src/door3d`)

Run from the repository's root; both write into `tools/door3d/out/` (not kept in the repository). Copy the `.webp`
files the scene uses into `src/door3d/assets/`.

1. `node tools/door3d/raster.mjs` draws the club's glowing sign from its own artwork (`src/data/art.ts`) on black, as
   `sign-on-black.png` (Playwright with Chrome; adjust the two paths at its top to where those are installed).
2. `python3 tools/door3d/textures.py` (numpy, scipy, Pillow) makes the surfaces: `slab-c/n/o.webp` (one slab of
   cast concrete, 3.7 m by 13 m: colour, normals, and occlusion with roughness), `wall-c/n/o.webp` (the wall round the
   door, a tile of 4.9 m by 5.2 m), `floor-m.webp` and `floor-r.webp` (where the stone floor is wet, its joints, its
   ripples), `haze.webp` (the mist), and `sign.webp` from the sign drawn in step 1.

Nothing here is photographed or downloaded: the concrete is noise shaped into formwork panels, tie holes, pores and
weather streaks.
