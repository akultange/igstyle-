"""The line-art set's small 3D draughtsman (src/data/lineart.ts): a scene is built in millimetres, projected through the
set's one camera (a near elevation, looking down 12.5 degrees, a long lens: parallel projection), and drawn as a
draughtsman would: the outline of every form where it turns away from the eye, the edges of hard things, the seams and
folds laid on a surface, and nothing that something nearer hides. Used by tools/lineart/guest.py and door.py.

    world      x to the right, y up, z towards the viewer (before the camera turns)
    camera     turned about the vertical (yaw), then tilted down (pitch); one drawing unit is `scale` millimetres^-1

Hidden lines are found by casting a ray from each point of a line towards the eye (trimesh with embree): a point is
drawn if nothing solid is in the way. Smooth forms (a figure, a dome) are polygonised from a signed distance field
(marching cubes) and their outline is the exact zero of n.v interpolated across each triangle, so it is a smooth curve,
not the stair of a mesh's edges.
"""
import math

import numpy as np
import trimesh
from skimage import measure


# ---------- the camera ----------

class Camera:
    def __init__(self, yaw=0.0, pitch=12.5, scale=0.25, cx=300.0, cy=500.0):
        self.yaw, self.pitch, self.s, self.cx, self.cy = math.radians(yaw), math.radians(pitch), scale, cx, cy
        c, s = math.cos(self.yaw), math.sin(self.yaw)
        ry = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
        c, s = math.cos(self.pitch), math.sin(self.pitch)
        rx = np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
        self.R = rx @ ry
        self.view = self.R.T @ np.array([0.0, 0.0, 1.0])     # from the scene towards the eye, in world terms

    def cam(self, p):
        return np.asarray(p, float) @ self.R.T

    def proj(self, p):
        q = self.cam(p)
        return np.stack([self.cx + self.s * q[..., 0], self.cy - self.s * q[..., 1]], -1)

    def depth(self, p):
        return self.cam(p)[..., 2]

    def unproj_floor(self, sx, sy, y=0.0):
        """The point on the plane at height y that lands at (sx, sy) in the drawing."""
        X = (sx - self.cx) / self.s
        Y = (self.cy - sy) / self.s
        # q = R p, p = (x, y, z): solve for x, z given X, Y and the plane's y
        Rt = self.R
        A = np.array([[Rt[0, 0], Rt[0, 2]], [Rt[1, 0], Rt[1, 2]]])
        b = np.array([X - Rt[0, 1] * y, Y - Rt[1, 1] * y])
        x, z = np.linalg.solve(A, b)
        return np.array([x, y, z])


# ---------- signed distance fields (Inigo Quilez's forms, vectorised) ----------

def dot(a, b):
    return np.sum(a * b, -1)


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def sd_sphere(p, c, r):
    return np.linalg.norm(p - c, axis=-1) - r


def sd_ellipsoid(p, c, r, R=None):
    q = p - c
    if R is not None:
        q = q @ R          # into the ellipsoid's own axes (R's columns are its axes)
    r = np.asarray(r, float)
    k0 = np.linalg.norm(q / r, axis=-1)
    k1 = np.linalg.norm(q / (r * r), axis=-1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


def sd_round_cone(p, a, b, r1, r2):
    """A capsule whose radius runs from r1 at a to r2 at b."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    ba = b - a
    l2 = float(ba @ ba)
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pa = p - a
    y = pa @ ba
    z = y - l2
    w = pa * l2 - y[..., None] * ba
    x2 = dot(w, w)
    y2 = y * y * l2
    z2 = z * z * l2
    k = math.copysign(1.0, rr) * rr * rr * x2 if rr != 0 else np.zeros_like(x2)
    d_b = np.sqrt(x2 + z2) * il2 - r2
    d_a = np.sqrt(x2 + y2) * il2 - r1
    d_m = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
    return np.where(np.sign(z) * a2 * z2 > k, d_b, np.where(np.sign(y) * a2 * y2 < k, d_a, d_m))


def sd_round_box(p, c, h, r, R=None):
    q = p - c
    if R is not None:
        q = q @ R
    q = np.abs(q) - (np.asarray(h, float) - r)
    return np.linalg.norm(np.maximum(q, 0), axis=-1) + np.minimum(np.max(q, -1), 0) - r


def sd_plane(p, n, o):
    n = np.asarray(n, float) / np.linalg.norm(n)
    return (p - o) @ n


def sd_chain(p, pts, radii, k=0.0):
    """A smooth limb along a chain of points (round cones joined)."""
    d = None
    for i in range(len(pts) - 1):
        di = sd_round_cone(p, pts[i], pts[i + 1], radii[i], radii[i + 1])
        d = di if d is None else smin(d, di, k)
    return d


def rot(axis, deg):
    a = math.radians(deg)
    axis = np.asarray(axis, float) / np.linalg.norm(axis)
    x, y, z = axis
    c, s, C = math.cos(a), math.sin(a), 1 - math.cos(a)
    return np.array([[c + x * x * C, x * y * C - z * s, x * z * C + y * s],
                     [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
                     [z * x * C - y * s, z * y * C + x * s, c + z * z * C]])


# ---------- a field made solid ----------

class Field:
    """A solid given by a signed distance function f(points (N,3)) -> (N,), inside its bounding box."""

    def __init__(self, f, lo, hi, step=4.0, name=''):
        self.f, self.lo, self.hi, self.step, self.name = f, np.asarray(lo, float), np.asarray(hi, float), step, name
        self._mesh = None

    def __call__(self, p):
        return self.f(p)

    def grad(self, p, h=0.35):
        e = np.eye(3) * h
        g = np.stack([self.f(p + e[i]) - self.f(p - e[i]) for i in range(3)], -1)
        return g / np.maximum(np.linalg.norm(g, axis=-1, keepdims=True), 1e-9)

    def snap(self, p, n=3):
        """Points near the surface, moved onto it."""
        p = np.asarray(p, float).copy()
        for _ in range(n):
            p = p - self.f(p)[..., None] * self.grad(p)
        return p

    def mesh(self):
        if self._mesh is not None:
            return self._mesh
        st = self.step
        n = np.ceil((self.hi - self.lo) / st).astype(int) + 3
        lo = self.lo - st
        xs, ys, zs = [lo[i] + st * np.arange(n[i]) for i in range(3)]
        vol = np.empty(n, np.float32)
        P = np.stack(np.meshgrid(ys, zs, indexing='ij'), -1).reshape(-1, 2)
        for i, x in enumerate(xs):           # slab by slab, to keep memory small
            pts = np.column_stack([np.full(len(P), x), P[:, 0], P[:, 1]])
            vol[i] = self.f(pts).reshape(n[1], n[2])
        if vol.min() >= 0 or vol.max() <= 0:
            raise ValueError(f'field {self.name!r} has no surface in its box')
        v, faces, _, _ = measure.marching_cubes(vol, 0.0, spacing=(st, st, st))
        v = v + lo
        v = self.snap(v, 2)
        m = trimesh.Trimesh(v, faces, process=True)
        self.normals = self.grad(m.vertices)       # the field's own normals: smooth, and outward
        self._mesh = m
        return m


# ---------- lines ----------

class Line:
    """A line to be drawn: a 3D polyline, its weight (1 contour, 2 detail, 3 hint) or a light style, and the normals of
    the surface it lies on (for the light it catches)."""

    def __init__(self, pts, w=1, normals=None, tag='', style=None, hide=True):
        self.p = np.asarray(pts, float)
        self.w, self.n, self.tag, self.style, self.hide = w, normals, tag, style, hide


def resample(p, step):
    p = np.asarray(p, float)
    if len(p) < 2:
        return p, np.arange(len(p))
    seg = np.linalg.norm(np.diff(p, axis=0), axis=1)
    t = np.concatenate([[0], np.cumsum(seg)])
    if t[-1] <= 0:
        return p[:1], np.zeros(1)
    m = max(2, int(math.ceil(t[-1] / step)) + 1)
    ts = np.linspace(0, t[-1], m)
    out = np.stack([np.interp(ts, t, p[:, i]) for i in range(p.shape[1])], -1)
    return out, ts / t[-1]


def chaikin(p, k=2, closed=False):
    p = np.asarray(p, float)
    for _ in range(k):
        if closed:
            q = np.roll(p, -1, 0)
            p = np.stack([0.75 * p + 0.25 * q, 0.25 * p + 0.75 * q], 1).reshape(-1, p.shape[1])
        else:
            q = np.empty((2 * (len(p) - 1), p.shape[1]))
            q[0::2] = 0.75 * p[:-1] + 0.25 * p[1:]
            q[1::2] = 0.25 * p[:-1] + 0.75 * p[1:]
            p = np.vstack([p[:1], q, p[-1:]])
    return p


def smooth(p, it=3, a=0.5):
    p = np.asarray(p, float).copy()
    for _ in range(it):
        p[1:-1] = (1 - a) * p[1:-1] + a * 0.5 * (p[:-2] + p[2:])
    return p


def circle3(c, r, normal=(0, 1, 0), n=256, a0=0.0, a1=2 * math.pi, up=None):
    c = np.asarray(c, float)
    nz = np.asarray(normal, float) / np.linalg.norm(normal)
    u = np.cross(nz, up if up is not None else ([1, 0, 0] if abs(nz[0]) < 0.9 else [0, 0, 1]))
    u /= np.linalg.norm(u)
    v = np.cross(nz, u)
    a = np.linspace(a0, a1, n)
    if np.isscalar(r):
        r = (r, r)
    return c + np.outer(np.cos(a) * r[0], u) + np.outer(np.sin(a) * r[1], v)


# ---------- outlines of smooth solids ----------

def outline(mesh, normals, view, min_len=6.0):
    """The smooth outline of a mesh: where n.v = 0, interpolated across each triangle; chained into polylines."""
    V, F = mesh.vertices, mesh.faces
    g = normals @ view
    s = g[F] > 0
    mixed = np.where(s.any(1) & ~s.all(1))[0]
    segs, keys = [], []
    for f in mixed:
        idx = F[f]
        pts, ks = [], []
        for a, b in ((0, 1), (1, 2), (2, 0)):
            ia, ib = idx[a], idx[b]
            ga, gb = g[ia], g[ib]
            if (ga > 0) != (gb > 0):
                t = ga / (ga - gb)
                pts.append(V[ia] + t * (V[ib] - V[ia]))
                ks.append((min(ia, ib), max(ia, ib)))
        if len(pts) == 2:
            segs.append(pts)
            keys.append(ks)
    # chain by shared edge keys
    by_key = {}
    for i, ks in enumerate(keys):
        for j, k in enumerate(ks):
            by_key.setdefault(k, []).append((i, j))
    used = np.zeros(len(segs), bool)
    chains = []
    for i0 in range(len(segs)):
        if used[i0]:
            continue
        used[i0] = True
        chain = [segs[i0][0], segs[i0][1]]
        kchain = [keys[i0][0], keys[i0][1]]
        for direction in (1, 0):
            while True:
                k = kchain[-1] if direction else kchain[0]
                nxt = [(i, j) for (i, j) in by_key.get(k, []) if not used[i]]
                if not nxt:
                    break
                i, j = nxt[0]
                used[i] = True
                other = 1 - j
                if direction:
                    chain.append(segs[i][other]); kchain.append(keys[i][other])
                else:
                    chain.insert(0, segs[i][other]); kchain.insert(0, keys[i][other])
        c = np.array(chain)
        if len(c) > 2 and np.sum(np.linalg.norm(np.diff(c, axis=0), axis=1)) >= min_len:
            chains.append(c)
    return chains


def sharp_edges(mesh, view, angle=30.0, silhouettes=True):
    """The hard edges of a faceted solid (where faces meet at more than `angle`), and its silhouette edges."""
    adj = mesh.face_adjacency
    ang = np.degrees(mesh.face_adjacency_angles)
    e = mesh.face_adjacency_edges
    fn = mesh.face_normals
    front = (fn @ view) > 0
    sharp = ang > angle
    sil = front[adj[:, 0]] != front[adj[:, 1]]
    keep = sharp | (sil if silhouettes else False)
    # boundary edges (open meshes)
    edges = [mesh.vertices[ed] for ed in e[keep]]
    try:
        b = trimesh.grouping.group_rows(mesh.edges_sorted, require_count=1)
        edges += [mesh.vertices[ed] for ed in mesh.edges_sorted[b]]
    except Exception:
        pass
    return join_segments(edges)


def join_segments(segs, tol=1e-4):
    """Chain loose segments that share end points into polylines."""
    segs = [np.asarray(s, float) for s in segs]
    if not segs:
        return []
    key = lambda p: tuple(np.round(p / tol).astype(np.int64)) if tol > 0 else tuple(p)
    ends = {}
    for i, s in enumerate(segs):
        ends.setdefault(key(s[0]), []).append((i, 0))
        ends.setdefault(key(s[-1]), []).append((i, 1))
    used = [False] * len(segs)
    out = []
    for i0 in range(len(segs)):
        if used[i0]:
            continue
        used[i0] = True
        chain = list(segs[i0])
        for direction in (1, 0):
            while True:
                end = chain[-1] if direction else chain[0]
                cands = [(i, j) for (i, j) in ends.get(key(end), []) if not used[i]]
                if not cands:
                    break
                i, j = cands[0]
                used[i] = True
                if direction:      # the chain's end is the segment's end j: carry on from there
                    s = segs[i] if j == 0 else segs[i][::-1]
                    chain.extend(list(s[1:]))
                else:              # the chain's start is the segment's end j: put the segment before it
                    s = segs[i] if j == 1 else segs[i][::-1]
                    chain[:0] = list(s[:-1])
        out.append(np.array(chain))
    return out


# ---------- the draughtsman ----------

class Scene:
    def __init__(self, cam):
        self.cam = cam
        self.solids = []          # meshes that hide what is behind them
        self.lines = []

    def solid(self, mesh):
        self.solids.append(mesh)
        return mesh

    def add(self, line):
        self.lines.append(line)
        return line

    def build(self):
        self.world = trimesh.util.concatenate(self.solids) if self.solids else None
        self.ray = trimesh.ray.ray_pyembree.RayMeshIntersector(self.world) if self.world is not None else None

    def visible(self, pts, normals=None, eps=0.8, eps_n=0.6):
        if self.ray is None or not len(pts):
            return np.ones(len(pts), bool)
        v = self.cam.view
        o = pts + v * eps
        if normals is not None:
            o = o + normals * eps_n
        d = np.repeat(v[None], len(pts), 0)
        return ~self.ray.intersects_any(o, d)

    def runs(self, line, step_px=0.5, min_px=1.2, gap_px=0.0):
        """The visible pieces of a line, in the drawing, each with the 3D points and normals it came from."""
        p = line.p
        if len(p) < 2:
            return []
        # resample in 3D so that consecutive points are about step_px apart in the drawing
        q2 = self.cam.proj(p)
        seg2 = np.linalg.norm(np.diff(q2, axis=0), axis=1)
        seg3 = np.linalg.norm(np.diff(p, axis=0), axis=1)
        ratio = np.where(seg3 > 0, seg2 / np.maximum(seg3, 1e-9), 0)
        L2 = np.concatenate([[0], np.cumsum(seg2)])
        if L2[-1] < min_px:
            return []
        m = max(2, int(math.ceil(L2[-1] / step_px)) + 1)
        ts = np.linspace(0, L2[-1], m)
        P = np.stack([np.interp(ts, L2, p[:, i]) for i in range(3)], -1)
        N = None
        if line.n is not None:
            N = np.stack([np.interp(ts, L2, line.n[:, i]) for i in range(3)], -1)
            N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
        vis = self.visible(P, N) if line.hide else np.ones(len(P), bool)
        out, start = [], None
        for i, v in enumerate(list(vis) + [False]):
            if v and start is None:
                start = i
            elif not v and start is not None:
                if i - start >= 2:
                    seg = slice(start, i)
                    q = self.cam.proj(P[seg])
                    if np.sum(np.linalg.norm(np.diff(q, axis=0), axis=1)) >= min_px:
                        out.append((q, P[seg], None if N is None else N[seg]))
                start = None
        return out


# ---------- path data ----------

def fmt(v):
    s = f'{v:.1f}'.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '', '-') else s


def dp(points, tol):
    """Douglas-Peucker in the drawing."""
    pts = np.asarray(points, float)
    if len(pts) < 3:
        return pts
    keep = np.zeros(len(pts), bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        A, B = pts[a], pts[b]
        AB = B - A
        L = np.hypot(*AB)
        seg = pts[a + 1:b]
        if L < 1e-9:
            d = np.hypot(*(seg - A).T)
        else:
            d = np.abs(AB[0] * (seg[:, 1] - A[1]) - AB[1] * (seg[:, 0] - A[0])) / L
        i = int(np.argmax(d))
        if d[i] > tol:
            k = a + 1 + i
            keep[k] = True
            stack += [(a, k), (k, b)]
    return pts[keep]


def path(pts, tol=0.08, closed=False):
    pts = dp(pts, tol)
    out = [f'M{fmt(pts[0][0])} {fmt(pts[0][1])}']
    px, py = round(pts[0][0], 1), round(pts[0][1], 1)
    for x, y in pts[1:]:
        x, y = round(x, 1), round(y, 1)
        dx, dy = round(x - px, 1), round(y - py, 1)
        if abs(dx) < 0.05 and abs(dy) < 0.05:
            continue
        out.append(f'l{fmt(dx)} {fmt(dy)}')
        px, py = x, y
    if closed:
        out.append('z')
    return ''.join(out).replace(' -', '-')


def plen(pts):
    pts = np.asarray(pts)
    return float(np.sum(np.hypot(*np.diff(pts, axis=0).T))) if len(pts) > 1 else 0.0


def group(runs, tol=0.08):
    runs = [r for r in runs if len(r) > 1 and plen(r) > 1.0]
    if not runs:
        return None
    d = ''.join(path(r, tol) for r in runs)
    longest = max(plen(r) for r in runs)
    total = sum(plen(r) for r in runs)
    return [d, round(total / longest, 2)]


def ts(x):
    if isinstance(x, list):
        return '[' + ', '.join(ts(v) for v in x) + ']'
    if isinstance(x, str):
        return "'" + x + "'"
    return fmt(x) if not float(x).is_integer() else str(int(x))


def preview_svg(box, groups, extra_back='', extra_front='', defs='', width=1200, bg='#050506'):
    """A quick look at a drawing (not the site's rendering, but the same weights)."""
    W, H = box
    h = round(width * H / W)
    css = ('.s{fill:none;stroke:#ecece8;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}'
           '.l1{stroke-width:1.25px}.l2{stroke-width:.75px;stroke-opacity:.45}.l3{stroke-width:.5px;stroke-opacity:.25}'
           '.la-g{fill:none;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}.la-flare{opacity:0}')
    body = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{width}" height="{h}" '
            f'style="background:{bg};--la-line:#ecece8;--la-red:#ff2d2d;--la-core:#ffe4de"><style>{css}</style><defs>{defs}</defs>{extra_back}']
    for w, items in groups:
        for it in items:
            if it is None:
                continue
            d, _ = it[0], it[1]
            style = f' style="{it[2]}"' if len(it) > 2 and it[2] else ''
            body.append(f'<path class="s l{w}" d="{d}"{style}/>')
    body.append(extra_front + '</svg>')
    return ''.join(body)


def field_lines(field, cam, w=1, min_len=6.0, tag='', snap=True, smooth_it=2):
    """The outline of a solid made from a field, as Lines carrying the surface's normals (for the light they catch,
    and so that a ray from the outline towards the eye starts just clear of the surface it grazes)."""
    m = field.mesh()
    out = []
    for c in outline(m, field.normals, cam.view, min_len):
        if snap:
            c = field.snap(c, 2)
        if smooth_it:
            c = smooth(c, smooth_it)
        out.append(Line(c, w, field.grad(c), tag))
    return out


class Placed:
    """A field built in its own frame, set into the world: world = local @ R.T + o."""

    def __init__(self, field, R, o):
        self.field, self.R, self.o = field, np.asarray(R, float), np.asarray(o, float)
        self.name = field.name
        self._mesh = None

    def local(self, p):
        return (np.asarray(p, float) - self.o) @ self.R

    def world(self, q):
        return np.asarray(q, float) @ self.R.T + self.o

    def __call__(self, p):
        return self.field(self.local(p))

    def grad(self, p):
        return self.field.grad(self.local(p)) @ self.R.T

    def snap(self, p, n=3):
        return self.world(self.field.snap(self.local(p), n))

    def mesh(self):
        if self._mesh is None:
            m = self.field.mesh().copy()
            m.vertices = self.world(m.vertices)
            self._mesh = m
            self.normals = self.field.normals @ self.R.T
        return self._mesh


def surface_contour(mesh, scalar, min_len=2.0):
    """Where a scalar on a mesh's vertices crosses zero (the meeting of two solids, a seam at a height): polylines."""
    V, F = mesh.vertices, mesh.faces
    g = scalar
    s = g[F] > 0
    mixed = np.where(s.any(1) & ~s.all(1))[0]
    segs = []
    for f in mixed:
        idx = F[f]
        pts = []
        for a, b in ((0, 1), (1, 2), (2, 0)):
            ia, ib = idx[a], idx[b]
            if (g[ia] > 0) != (g[ib] > 0):
                t = g[ia] / (g[ia] - g[ib])
                pts.append(V[ia] + t * (V[ib] - V[ia]))
        if len(pts) == 2:
            segs.append(np.array(pts))
    chains = join_segments(segs, tol=1e-3)
    return [c for c in chains if len(c) > 1 and np.sum(np.linalg.norm(np.diff(c, axis=0), axis=1)) >= min_len]
