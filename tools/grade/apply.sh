#!/bin/bash
# Grade every photograph and film of the site in the house grade (tools/grade/house.py), from the untouched originals
# in git (REF, default origin/redesign/mezhdu: the files as they came), into public/ in place. Run from the repository's
# root. Pictures: graded exactly in Python, WebP at quality 86. Films: through the 3D LUT (house.cube) in ffmpeg,
# BT.709 in and out, H.264 High at about their original bitrate, no sound.
#   bash tools/grade/apply.sh [REF] [images|films|all]
set -euo pipefail
REF="${1:-origin/redesign/mezhdu}"
WHAT="${2:-all}"
TMP=$(mktemp -d)
python3 -I tools/grade/house.py cube tools/grade/house.cube
if [ "$WHAT" != films ]; then
  git ls-tree -r --name-only "$REF" -- public/media public/video | grep -iE '\.webp$' > "$TMP/images.txt"
  python3 -I - "$REF" "$TMP" <<'PY'
import subprocess, sys, os
sys.path.insert(0, 'tools/grade')
import house
ref, tmp = sys.argv[1], sys.argv[2]
for i, f in enumerate(open(os.path.join(tmp, 'images.txt')).read().split()):
    src = os.path.join(tmp, 'orig.webp')
    with open(src, 'wb') as o:
        o.write(subprocess.run(['git', 'show', f'{ref}:{f}'], capture_output=True, check=True).stdout)
    house.image(src, f, 86)
    if i % 20 == 0:
        print('images', i, f, flush=True)
print('images done', flush=True)
PY
fi
if [ "$WHAT" != images ]; then
  for f in $(git ls-tree -r --name-only "$REF" -- public/media public/video | grep -iE '\.mp4$'); do
    git show "$REF:$f" > "$TMP/orig.mp4"
    br=$(ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate -of csv=p=0 "$TMP/orig.mp4")
    max=$(( br * 13 / 10 )); buf=$(( br * 26 / 10 ))
    ffmpeg -v error -y -i "$TMP/orig.mp4" \
      -vf "scale=in_range=tv:in_color_matrix=bt709:out_color_matrix=bt709,format=gbrp,lut3d=file=tools/grade/house.cube:interp=tetrahedral,scale=in_color_matrix=bt709:out_color_matrix=bt709:out_range=tv,format=yuv420p" \
      -c:v libx264 -profile:v high -preset medium -crf 20 -maxrate "$max" -bufsize "$buf" \
      -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -movflags +faststart -an "$f"
    echo "film $f $(stat -c%s "$TMP/orig.mp4") -> $(stat -c%s "$f")"
  done
  echo 'films done'
fi
