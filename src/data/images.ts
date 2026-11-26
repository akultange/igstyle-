// Smaller copies of the site's photographs (public/media) and 3D icons (public/img/icons), so a phone doesn't fetch a
// desktop's picture. A component asks here for the srcset of a picture; the build makes the copies it names, from the
// originals (tools/build/assets.mjs; in `astro dev`, on request). Nothing to prepare by hand: a new photo gets its
// copies on the next build.
import path from 'node:path';
import sharp from 'sharp';

/** The widths a photograph is copied at (those under its own). */
const WIDTHS = [320, 480, 640, 960, 1280];
/** The icons' widths (they show at 26 to 120 px). */
const ICON_WIDTHS = [64, 96, 128, 192, 256, 320];

const known = new Map<string, Promise<{ width: number; height: number } | null>>();
/** A picture's own size, read from the file in public/. */
export function dims(src: string) {
  if (!known.has(src)) {
    known.set(src, sharp(path.join(process.cwd(), 'public', src)).metadata().then(
      (m) => (m.width && m.height ? { width: m.width, height: m.height } : null),
      () => null,
    ));
  }
  return known.get(src)!;
}

const set = (widths: number[], own: number, url: (w: number) => string, original: string) => {
  const smaller = widths.filter((w) => w < own * 0.9);
  return smaller.length ? [...smaller.map((w) => `${url(w)} ${w}w`), `${original} ${own}w`].join(', ') : undefined;
};

/** srcset and sizes for a photograph in public/media. `sizes` says how wide it shows; a lazy picture lets the browser
 *  measure that itself where it can ("auto"), the rest is for those that can't. */
export async function photo(src: string | undefined, sizes: string, lazy = true): Promise<{ srcset?: string; sizes?: string }> {
  const m = src?.match(/^\/media\/([^/]+\.(?:webp|jpe?g|png))$/);
  if (!src || !m) return {};
  const d = await dims(src);
  const srcset = d && set(WIDTHS, d.width, (w) => `/media/w/${w}/${m[1]}`, src);
  return srcset ? { srcset, sizes: lazy ? `auto, ${sizes}` : sizes } : {};
}

/** srcset and sizes for a 3D icon (its AVIF, made from the PNG master), shown `size` px wide. */
export async function icon(name: string, size: number, lazy = true): Promise<{ srcset: string; sizes: string }> {
  const d = await dims(`/img/icons/${name}.png`);
  const original = `/img/icons/${name}.avif`;
  const srcset = (d && set(ICON_WIDTHS, d.width, (w) => `/img/icons/w/${w}/${name}.avif`, original)) || original;
  return { srcset, sizes: lazy ? `auto, ${size}px` : `${size}px` };
}
