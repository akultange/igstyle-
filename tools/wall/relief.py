"""The lilies carved into the wall (src/wall): two height maps, one wide (a screen held level) and one tall (a phone
held upright), from the reliefs drawn for this in Higgsfield (GPT Image 2.6, 2026-11-26, the prompt asked for a
height map: black is the flat wall, white the relief's highest point).

  relief-w.webp  1920 px wide   lilies grow in from the lower left and hang from the upper right; the middle is calm
  relief-t.webp  1080 px wide   lilies frame the screen along its edges; the middle is calm for the words

The drawing carries a little of its own light inside the forms; as a height it still reads as rounded petals. Here it
is made grey, eased (the background pushed to an exact zero, so the flat wall stays flat), softened by a pixel (so the
browser's own lighting has no stairs to catch), and each form swollen from its outline into a soft dome: the drawing's
grey alone reads as flat plateaus with embossed rims, the dome gives the light round volumes to travel over.
Run:  python3 tools/wall/relief.py <wide.png> <tall.png> public/img/wall
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

wide, tall, out = sys.argv[1:4]
for src, name, width in ((wide, 'relief-w.webp', 1920), (tall, 'relief-t.webp', 1080)):
    im = Image.open(src).convert('L')
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im = im.filter(ImageFilter.GaussianBlur(0.8))
    a = np.asarray(im).astype(np.float64) / 255
    a = np.clip((a - 0.025) / 0.975, 0, 1) ** 1.15
    # the drawing's own grey is mostly its light, so a petal reads as a plateau; swell each form from its outline
    # (the distance in from its edge, as a dome) so the light finds round volumes, the drawing's detail on top
    inside = a > 0.06
    dist = ndimage.distance_transform_edt(inside) * (1920 / width if width < 1920 else 1.0)
    dome = np.sqrt(np.clip(dist / 26.0, 0, 1))
    soft = ndimage.gaussian_filter(a, 6)
    a = np.clip(0.42 * a + 0.22 * soft + 0.36 * dome * np.clip(a * 3, 0, 1), 0, 1)
    Image.fromarray(np.round(a * 255).astype(np.uint8), 'L').save(f'{out}/{name}', 'WEBP', quality=86, method=6)
    print(name, im.size)
