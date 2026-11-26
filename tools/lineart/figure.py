"""The guest for the closing card's drawing (tools/lineart/guest.py): a man in a tailored suit, standing, seen from
behind and a little to his left, built as a tailor and a sculptor would: a head, a neck, a shirt collar, a jacket
(its body, its two sleeves set into it, its collar), trousers and a pair of oxfords, each a solid of its own, so that
where one meets another the line is the seam itself (the sleeve's armhole, the collar's seam). Then what a draughtsman
adds: the back seam and the vent, the side bodies, the cuff buttons, the folds where an arm bends and where a hand
sits in a pocket, the crease of the trousers, the welt of the shoes, the ear, the hair.

Units are millimetres. His own frame: x to his right, y up, z to his back (he faces -z); 1.82 m in his shoes.
His weight is on his right leg; his left hand is in his trouser pocket (the jacket pushed back behind his forearm),
his right arm hangs; his head is turned to his left, towards the light.
"""
import math

import numpy as np
from scipy.interpolate import PchipInterpolator

from engine import (Field, Line, rot, sd_ellipsoid, sd_round_cone, sd_round_box, sd_chain, smin, smax, smooth,
                    chaikin, resample)


# ---------- the pose ----------
HIP_R, HIP_L = np.array([88.0, 968, 2]), np.array([-88.0, 940, 2])
KNEE_R, KNEE_L = np.array([86.0, 528, -4]), np.array([-120.0, 516, -30])
ANKLE_R, ANKLE_L = np.array([84.0, 96, 6]), np.array([-156.0, 98, -40])
FOOT_R, FOOT_L = 9.0, -21.0           # each foot turned out this much (degrees, about the vertical)

SH_R, SH_L = np.array([192.0, 1406, 12]), np.array([-194.0, 1418, 12])     # the arm's root inside the sleeve head
ELB_R, ELB_L = np.array([274.0, 1162, 54]), np.array([-282.0, 1172, 58])
WRI_R, WRI_L = np.array([156.0, 970, -44]), np.array([-158.0, 976, -42])

NECK_B = np.array([0.0, 1518, 30])      # the neck's base at the back, inside the collar
NECK_T = np.array([0.0, 1640, 4])
HEAD_PIVOT = np.array([0.0, 1610, 10])
HEAD_YAW, HEAD_PITCH, HEAD_ROLL = 18.0, 3.0, -2.0   # turned to his left, a touch down, a touch tilted


def _pchip(keys):
    ys = keys[:, 0]
    return ys, [PchipInterpolator(ys, keys[:, i]) for i in range(1, keys.shape[1])]


def loft(keys):
    """A body made of horizontal superellipse sections: rows of (y, half width, depth behind, depth in front,
    centre x, centre z, exponent)."""
    ys, fns = _pchip(np.asarray(keys, float))
    y0, y1 = ys[0], ys[-1]

    def f(p):
        y = np.clip(p[:, 1], y0, y1)
        a, bb, bf, cx, cz, n = [fn(y) for fn in fns]
        dx = np.abs(p[:, 0] - cx) / a
        dzr = p[:, 2] - cz
        b = np.where(dzr > 0, bb, bf)
        dz = np.abs(dzr) / b
        q = (dx ** n + dz ** n) ** (1 / n)
        return (q - 1) * np.minimum(a, b)
    return f, y0, y1


# ---------- the jacket ----------
# (y, half width, behind, in front, centre x, centre z, exponent): hem, seat, hip, waist, chest, shoulder blades
JACKET = [
    (762, 187, 128, 120, 0, 0, 2.35),
    (845, 191, 144, 112, 0, 0, 2.4),
    (945, 176, 134, 110, 0, 0, 2.4),
    (1050, 162, 122, 112, 0, 0, 2.35),
    (1110, 157, 120, 114, 0, 0, 2.3),
    (1200, 168, 124, 119, 0, 0, 2.3),
    (1300, 190, 132, 124, 0, 0, 2.45),
    (1375, 201, 137, 121, 0, 2, 2.6),
    (1440, 201, 127, 105, 0, 6, 2.7),
    (1478, 186, 104, 86, 0, 10, 2.7),
]
HEM_Y = JACKET[0][0]
_jl, _jy0, _jy1 = loft(JACKET)

NECKPT_R, NECKPT_L = np.array([70.0, 1522, 20]), np.array([-70.0, 1530, 20])     # where the shoulder seam meets the collar
SHPT_R, SHPT_L = np.array([212.0, 1468, 14]), np.array([-214.0, 1482, 14])      # the shoulder point (end of the seam)


def jacket_body(p):
    d = _jl(p)
    d = smax(d, _jy0 - p[:, 1], 3)                       # the hem
    d = smax(d, p[:, 1] - _jy1 - 40, 20)
    # the shoulders: from the collar out to the shoulder points, padded, nearly straight, a little sloped
    for npt, spt in ((NECKPT_R, SHPT_R), (NECKPT_L, SHPT_L)):
        a = npt + np.array([0, -56, 0])
        b = spt + np.array([-14 * np.sign(spt[0]), -50, 0])
        d = smin(d, sd_round_cone(p, a, b, 58, 50), 34)
    # both hands in the trouser pockets: the jacket's fronts are pushed back behind the forearms
    for elb, wri, side in ((ELB_L, WRI_L, -1), (ELB_R, WRI_R, 1)):
        fore = wri - elb
        n = np.cross(fore, [0, 1, 0]); n /= np.linalg.norm(n)
        if n[2] < 0:
            n = -n                                                        # towards his back
        behind = (p - elb) @ n                                            # < 0: in front of the forearm
        cut = smax(smax(behind + 16, p[:, 1] - 1090, 40), 95 - side * p[:, 0], 30)    # in front of the forearm, low, at the side
        d = smax(d, -cut, 22)
    return d


def jacket_body_plain(p):
    """The jacket's body without the hands in the pockets: the loft, the hem, the shoulders."""
    d = _jl(p)
    d = smax(d, _jy0 - p[:, 1], 3)
    d = smax(d, p[:, 1] - _jy1 - 40, 20)
    for npt, spt in ((NECKPT_R, SHPT_R), (NECKPT_L, SHPT_L)):
        a = npt + np.array([0, -56, 0])
        b = spt + np.array([-14 * np.sign(spt[0]), -50, 0])
        d = smin(d, sd_round_cone(p, a, b, 58, 50), 34)
    return d


def sleeve(p, sh, el, wr, r=(63, 56, 47)):
    # the cuff stops short of the wrist so the shirt's cuff shows below it
    end = wr + (el - wr) * 0.07
    d = smin(sd_round_cone(p, sh, el, r[0], r[1]), sd_round_cone(p, el, end, r[1], r[2]), 10)
    # its end is cut square (the cuff), not round
    ax = (end - el) / np.linalg.norm(end - el)
    d = smax(d, (p - end) @ ax, 2.5)
    # the sleeve head stands a little proud of the shoulder (a soft roll), and is cut off at the shoulder seam
    return d


def collar(p):
    a, b = NECK_B + np.array([0, -10, 0]), np.array([0.0, 1590, 12])
    d = sd_round_cone(p, a, b, 71, 67)
    top = (p - np.array([0, 1568, 18])) @ np.array([0, 0.97, 0.24])      # its top edge, tilted with the neck
    d = smax(d, top, 3)
    d = smax(d, -((p - np.array([0, 1500, 0])) @ np.array([0, 1, 0])), 4)
    return d


def shirt_collar(p):
    d = sd_round_cone(p, NECK_B + np.array([0, -4, -2]), np.array([0.0, 1610, 8]), 63.5, 61)
    top = (p - np.array([0, 1586, 14])) @ np.array([0, 0.965, 0.26])
    return smax(d, top, 2.5)


def shirt_cuff(p, el, wr):
    ax = (wr - el) / np.linalg.norm(wr - el)
    a = wr + (el - wr) * 0.12
    b = wr + ax * 8
    d = sd_round_cone(p, a, b, 44, 41)
    return smax(d, (p - b) @ ax, 1.5)


# ---------- trousers ----------
def trouser_leg(p, hip, knee, ankle, r=(90, 69, 61)):
    # fabric hangs from the seat: the leg's line runs from the hip to the hem, the knee only pushes it a little
    hem = np.array([ankle[0], 52.0, ankle[2] + 8])
    mid = hip + (hem - hip) * 0.47
    k = mid + (knee - mid) * 0.55                    # the knee draws the cloth towards it, by half
    d = smin(sd_round_cone(p, hip, k, r[0], r[1]), sd_round_cone(p, k, hem, r[1], r[2]), 60)
    return d


def trousers(p):
    d = smin(trouser_leg(p, HIP_R, KNEE_R, ANKLE_R), trouser_leg(p, HIP_L, KNEE_L, ANKLE_L, r=(91, 69, 61)), 40)
    seat = sd_ellipsoid(p, np.array([0, 920, 30]), (178, 120, 120))
    d = smin(d, seat, 50)
    # a hand in each pocket
    d = smin(d, sd_ellipsoid(p, np.array([-156, 952, -52]), (40, 58, 34), rot([0, 0, 1], 18)), 18)
    d = smin(d, sd_ellipsoid(p, np.array([154, 946, -54]), (40, 58, 34), rot([0, 0, 1], -18)), 18)
    # the hems: level at the back of the heel, resting on the shoe in front (the break)
    for ank in (ANKLE_R, ANKLE_L):
        local = p - ank
        near = np.exp(-((local[:, 0] / 140) ** 2 + (local[:, 2] / 160) ** 2))
        hem_y = 44 + 42 * np.clip(-local[:, 2] / 120, 0, 1)
        d = np.where(near > 0.5, smax(d, hem_y - p[:, 1], 3), d)
    return smax(d, p[:, 1] - 1060, 10)


# ---------- shoes ----------
def shoe_frame(ankle, turn):
    R = rot([0, 1, 0], turn)
    fwd = R @ np.array([0, 0, -1.0])
    side = R @ np.array([1, 0, 0.0])
    return fwd, side


def shoe_upper(p, ankle, turn):
    fwd, side = shoe_frame(ankle, turn)
    o = np.array([ankle[0], 0, ankle[2]])
    q = p - o
    u = q @ fwd          # along the shoe (toe +)
    v = q[:, 1]
    w = q @ side
    loc = np.stack([w, v, u], -1)
    heel = sd_ellipsoid(loc, np.array([0, 52, -44]), (40, 54, 46))            # the heel counter, rounded and tall
    mid = sd_ellipsoid(loc, np.array([2, 50, 60]), (47, 46, 90))              # the waist and the instep
    ball = sd_ellipsoid(loc, np.array([4, 40, 150]), (51, 36, 70))
    toe = sd_ellipsoid(loc, np.array([4, 30, 214]), (42, 26, 52))             # the toe, a little square
    d = smin(smin(smin(heel, mid, 36), ball, 40), toe, 34)
    d = smin(d, sd_round_cone(loc, np.array([0, 60, 4]), np.array([0, 130, -4]), 44, 40), 28)    # the ankle in it
    return smax(d, 20 - v, 2)


def shoe_sole(p, ankle, turn):
    fwd, side = shoe_frame(ankle, turn)
    o = np.array([ankle[0], 0, ankle[2]])
    q = p - o
    u = q @ fwd
    slice_ = p.copy()
    slice_[:, 1] = 34
    d2 = shoe_upper(slice_, ankle, turn) - 5            # the welt: a few millimetres proud of the upper
    top = 12 + 14 * np.clip((-u + 10) / 50, 0, 1)        # the heel block is higher
    dv = np.maximum(-p[:, 1], p[:, 1] - top)
    return smax(d2, dv, 1.5)


# ---------- the head ----------
_HR = rot([0, 1, 0], HEAD_YAW) @ rot([1, 0, 0], HEAD_PITCH) @ rot([0, 0, 1], HEAD_ROLL)


def to_head(p):
    """Points in his frame to the head's own (the head turned on its pivot)."""
    return (p - HEAD_PIVOT) @ _HR + HEAD_PIVOT


def from_head(q):
    return (q - HEAD_PIVOT) @ _HR.T + HEAD_PIVOT


HEAD_S = 0.94     # the head's size against the rest of him


def _skull(q):
    c = HEAD_PIVOT + (q - HEAD_PIVOT) / HEAD_S
    d = sd_ellipsoid(c, np.array([0, 1716, -4]), (72, 104, 97))                 # the cranium
    d = smin(d, sd_ellipsoid(c, np.array([0, 1692, 40]), (62, 64, 52)), 24)    # the back of the head
    return d * HEAD_S, c


def head(p):
    q = to_head(p)
    d, c = _skull(q)
    f = sd_ellipsoid(c, np.array([0, 1668, -52]), (60, 78, 44))                 # the face
    f = smin(f, sd_ellipsoid(c, np.array([0, 1626, -44]), (50, 46, 54)), 28)   # the jaw
    f = smin(f, sd_ellipsoid(c, np.array([0, 1604, -66]), (20, 17, 22)), 16)   # the chin
    d = smin(d, f * HEAD_S, 30 * HEAD_S)
    d = smin(d, sd_round_cone(q, NECK_B + np.array([0, 8, -6]), NECK_T, 52, 48), 28)               # the neck
    return d


def hair(p):
    """A short cut: a thin layer over the skull, fuller on the crown, tapering to nothing at the nape."""
    q = to_head(p)
    d, c = _skull(q)
    thick = 1.2 + 6.5 * np.clip((q[:, 1] - 1650) / 110, 0, 1)
    d = d - thick
    d = smax(d, _hairline(q) - q[:, 1], 1.5)
    # (none over the ears: a clear space round each)
    c = HEAD_PIVOT + (q - HEAD_PIVOT) / HEAD_S
    for s in (1, -1):
        d = smax(d, -sd_ellipsoid(c, np.array([s * 74.0, 1686, 12]), (26, 44, 32)), 3)
    return d


def ear(p, s=1):
    q = to_head(p)
    q = HEAD_PIVOT + (q - HEAD_PIVOT) / HEAD_S
    R = rot([0, 1, 0], -s * 38) @ rot([1, 0, 0], -14)
    c = np.array([s * 77.0, 1684, 12])
    d = sd_ellipsoid(q, c, (8.5, 34, 22), R)
    d = smin(d, sd_ellipsoid(q, c + np.array([-s * 7, -5, -6]), (10, 21, 13), R), 9)
    return d * HEAD_S


def _hairline(q):
    """Where the hair stops, as a height round the head: low at the nape, over the ears, high at the brow."""
    phi = np.degrees(np.arctan2(np.abs(q[:, 0]), q[:, 2]))      # 0 at the back, 90 at the sides, 180 in front
    def ss(a, b, x):
        t = np.clip((x - a) / (b - a), 0, 1)
        return t * t * (3 - 2 * t)
    return 1626 + 86 * ss(48, 92, phi) + 66 * ss(112, 162, phi) - 12 * np.exp(-((phi - 104) / 9) ** 2)


# ---------- the hands ----------
def hand_r(p):
    """His right hand, hanging, the fingers a little curled: the back of the hand to the outside."""
    ax = WRI_R - ELB_R
    ax /= np.linalg.norm(ax)
    out = np.array([1.0, 0, 0.18]); out -= ax * (out @ ax); out /= np.linalg.norm(out)    # the back of the hand
    fw = np.cross(ax, out)                       # across the hand, thumb side forward
    def P(a, o, f):                              # along the arm, out of the back of the hand, across
        return WRI_R + a * ax + o * out + f * fw
    R = np.column_stack([fw, ax, out])           # the hand's own axes as columns
    d = sd_round_box(p, P(46, -2, 0), (36, 44, 13), 11, R)                                   # the palm
    d = smin(d, sd_round_cone(p, P(-10, 0, 0), P(18, 0, 0), 33, 36), 14)                   # the wrist
    for i, f in enumerate((-24, -8, 8, 22)):                                                # fingers, little to index
        L = (48, 56, 60, 54)[i]
        a0 = P(88, 0, f)
        a1 = P(88 + L * 0.48, -10, f)
        a2 = P(88 + L * 0.82, -26, f * 0.96)
        a3 = P(88 + L * 0.92, -40, f * 0.92)
        r = (9.5, 8.8, 8.0, 9.2)[i]
        d = smin(d, sd_chain(p, [a0, a1, a2, a3], [r, r * 0.92, r * 0.85, r * 0.8], 5), 6)
    # the thumb, forward and in
    t0, t1, t2 = P(30, -14, 30), P(62, -26, 42), P(88, -36, 40)
    d = smin(d, sd_chain(p, [t0, t1, t2], [14, 11, 9.5], 6), 10)
    return d


# ---------- all of him ----------
def parts():
    """His solids: (name, field). Each is drawn by its outline; where they meet, the seam."""
    out = []
    def F(name, f, lo, hi, step):
        out.append((name, Field(f, lo, hi, step, name)))
    F('jacket', jacket_body, [-300, 740, -230], [300, 1600, 230], 3.5)
    F('sleeve_r', lambda p: sleeve(p, SH_R, ELB_R, WRI_R), [80, 900, -120], [360, 1500, 150], 3.0)
    F('sleeve_l', lambda p: sleeve(p, SH_L, ELB_L, WRI_L), [-370, 900, -120], [-80, 1500, 150], 3.0)
    F('collar', collar, [-100, 1490, -80], [100, 1600, 110], 2.0)
    F('shirt_collar', shirt_collar, [-90, 1495, -80], [90, 1620, 100], 2.0)
    F('trousers', trousers, [-280, 30, -200], [250, 1070, 210], 4.0)
    F('shoe_r_up', lambda p: shoe_upper(p, ANKLE_R, FOOT_R), [-20, 0, -280], [180, 190, 110], 2.5)
    F('shoe_l_up', lambda p: shoe_upper(p, ANKLE_L, FOOT_L), [-280, 0, -320], [-20, 190, 80], 2.5)
    F('shoe_r_sole', lambda p: shoe_sole(p, ANKLE_R, FOOT_R), [-20, -2, -280], [180, 36, 110], 2.0)
    F('shoe_l_sole', lambda p: shoe_sole(p, ANKLE_L, FOOT_L), [-280, -2, -320], [-20, 36, 80], 2.0)
    F('head', head, [-120, 1490, -170], [120, 1850, 120], 2.0)
    F('hair', hair, [-110, 1600, -140], [110, 1850, 120], 1.5)
    F('ear_r', lambda p: ear(p, 1), [-120, 1630, -100], [120, 1740, 100], 1.0)
    F('ear_l', lambda p: ear(p, -1), [-120, 1630, -100], [120, 1740, 100], 1.0)
    return out


# ---------- what a draughtsman adds ----------

def _jacket_local(P, v):
    return P['jacket'].local(v)


def details(P):
    """The seams, edges and folds, as Lines (weight 2 unless said), laid on his solids. P: name -> placed field."""
    from engine import surface_contour, Line, smooth
    out = []

    def on(name, scalar_fn, keep=None, w=2, sm=3, tag=''):
        m = P[name].mesh()
        loc = P[name].local(m.vertices)
        val = scalar_fn(loc)
        for c in surface_contour(m, val):
            cl = P[name].local(c)
            if keep is not None:
                mask = keep(cl)
                # split where the mask is false
                runs, cur = [], []
                for pt, k in zip(c, mask):
                    if k:
                        cur.append(pt)
                    elif cur:
                        runs.append(cur); cur = []
                if cur:
                    runs.append(cur)
            else:
                runs = [list(c)]
            for r in runs:
                r = np.array(r)
                if len(r) > 3:
                    r = smooth(r, sm)
                    out.append(Line(r, w, P[name].grad(r), tag or name))

    # the collars' top edges (the crease where the cut meets the band): the jacket's collar, then the shirt's above it
    on('collar', lambda q: (q - np.array([0, 1568, 18])) @ np.array([0, 0.97, 0.24]) + 1.6, w=1, tag='collar-edge')
    on('shirt_collar', lambda q: (q - np.array([0, 1586, 14])) @ np.array([0, 0.965, 0.26]) + 1.2, w=1, tag='shirt-edge')
    # the back seam, down the middle from the collar to the top of the vent; then the vent's lap to the hem
    on('jacket', lambda q: q[:, 0] - 0.0, keep=lambda q: (q[:, 2] > 40) & (q[:, 1] > 1000) & (q[:, 1] < 1536), tag='back-seam')
    on('jacket', lambda q: q[:, 0] - 5.0, keep=lambda q: (q[:, 2] > 40) & (q[:, 1] <= 1004) & (q[:, 1] > 764), tag='vent')
    # the side bodies: a seam each side from the armhole down to the hem, curving in at the waist
    def side_body(sgn):
        def f(q):
            y = q[:, 1]
            x0 = 128 + 20 * np.clip((y - 1110) / 280, 0, 1) ** 1.3 + 14 * np.clip((1110 - y) / 340, 0, 1)
            return sgn * q[:, 0] - x0
        return f
    for sgn in (1, -1):
        on('jacket', side_body(sgn), keep=lambda q: (q[:, 2] > 30) & (q[:, 1] < 1380) & (q[:, 1] > 764), tag='side-body')
    # the tension across the back with the elbows out: two shallow folds between the shoulder blades
    for y0, amp in ((1336, 10), (1292, 7)):
        on('jacket', lambda q, y0=y0, amp=amp: q[:, 1] - (y0 - amp * (1 - (q[:, 0] / 150) ** 2)),
           keep=lambda q: (q[:, 2] > 60) & (np.abs(q[:, 0]) < 118 - (1336 - y0)), w=3, tag='back-fold')
    # the sleeves' back seams: along each sleeve on its back, from under the armhole to the cuff
    for name, sh, el, wr in (('sleeve_l', SH_L, ELB_L, WRI_L), ('sleeve_r', SH_R, ELB_R, WRI_R)):
        ax1 = (el - sh) / np.linalg.norm(el - sh)
        back = np.array([0, 0, 1.0]); back -= ax1 * (back @ ax1); back /= np.linalg.norm(back)
        side = np.cross(ax1, back)
        def seam(q, sh=sh, side=side):
            return (q - sh) @ side * np.sign(sh[0]) + 22
        on(name, seam, keep=lambda q, sh=sh: ((q - sh) @ np.array([0, 0, 1.0]) > 0) & (q[:, 1] < sh[1] - 60), tag='sleeve-seam')
    # the elbow's folds: on the outside of each bent elbow, two arcs above it and two below, each only part way round
    for name, sh, el, wr in (('sleeve_l', SH_L, ELB_L, WRI_L), ('sleeve_r', SH_R, ELB_R, WRI_R)):
        a1 = (el - sh) / np.linalg.norm(el - sh)
        a2 = (wr - el) / np.linalg.norm(wr - el)
        outw = np.array([np.sign(el[0]), 0, 0.55]); outw /= np.linalg.norm(outw)
        for t, tilt, span in ((-64, 0.32, 0.42), (-30, -0.22, 0.58), (24, 0.26, 0.5), (58, -0.3, 0.36)):
            ax = a1 if t < 0 else a2
            c = el + ax * t
            def ring(q, c=c, ax=ax, tilt=tilt):
                rel = q - c
                return rel @ ax + tilt * (rel @ np.array([0, 0, 1.0])) + 0.0006 * ((rel @ np.array([0, 1.0, 0])) ** 2)
            def keep(q, c=c, span=span, outw=outw):
                return ((q - c) @ outw) > (1 - span) * 52
            on(name, ring, keep=keep, w=2, sm=2, tag='elbow-fold')
    # trousers: behind the bent left knee, two soft folds, each a shallow arc that thins out at its ends
    for t, amp, tilt in ((548, 14, .18), (506, 10, -.12)):
        on('trousers', lambda q, t=t, amp=amp, tilt=tilt: q[:, 1] - t - amp * np.cos((q[:, 0] - KNEE_L[0]) / 48) - tilt * (q[:, 0] - KNEE_L[0]),
           keep=lambda q: (q[:, 0] < -78) & (q[:, 0] > -168) & (q[:, 2] > KNEE_L[2] + 22), w=2, tag='knee-fold')
    for ank in (ANKLE_R, ANKLE_L):
        on('trousers', lambda q, ank=ank: q[:, 1] - 118 - 10 * np.cos((q[:, 0] - ank[0]) / 30),
           keep=lambda q, ank=ank: (np.abs(q[:, 0] - ank[0]) < 70) & (q[:, 2] > ank[2] - 30), w=3, tag='break')
    # the shoes' welts: where the upper meets the sole
    for up, so in (('shoe_r_up', 'shoe_r_sole'), ('shoe_l_up', 'shoe_l_sole')):
        m = P[up].mesh()
        val = P[so](m.vertices)
        for c in surface_contour(m, val - 0.6):
            if len(c) > 3:
                out.append(Line(smooth(c, 2), 2, P[up].grad(c), 'welt'))
    # the hair: strokes combed down and back from the crown, laid on the hair's own surface; short ones at the nape
    rng = np.random.default_rng(11)
    hm = P['hair'].mesh()
    hv = hm.vertices
    hq = to_head(P['hair'].local(hv))
    crown = np.array([0, 1792, 34.0])
    cand = np.where(hq[:, 1] > _hairline(hq) + 8)[0]
    seeds = rng.choice(cand, size=min(240, len(cand)), replace=False)
    for k in seeds:
        pt = hv[k].copy()
        pts = [pt]
        L = rng.uniform(16, 34)
        for _ in range(int(L / 2.5)):
            qq = to_head(P['hair'].local(pt[None]))[0]
            away = qq - crown
            away[1] = 0
            nrm = np.linalg.norm(away)
            dir_h = away / nrm if nrm > 1e-6 else np.zeros(3)
            d_loc = np.array([0, -1.0, 0]) + 0.55 * dir_h            # down, and out from the crown
            # move in the head's frame, then back to the world
            ql = P['hair'].local(pt[None])[0]
            qhd = to_head(ql[None])[0] + d_loc * 2.5
            ql2 = from_head(qhd[None])[0]
            pt = P['hair'].world(ql2[None])[0]
            pt = P['hair'].snap(pt[None], 2)[0]
            if to_head(P['hair'].local(pt[None]))[0, 1] < _hairline(to_head(P['hair'].local(pt[None])))[0] + 2:
                break
            pts.append(pt)
        if len(pts) > 3:
            pts = np.array(pts)
            out.append(Line(smooth(pts, 2), 3, P['hair'].grad(pts), 'hair'))
    # the ear's rim (the helix folded over), inside its outline
    for sgn, name in ((1, 'ear_r'), (-1, 'ear_l')):
        m = P[name].mesh()
        ql = HEAD_PIVOT + (to_head(P[name].local(m.vertices)) - HEAD_PIVOT) / HEAD_S
        R = rot([0, 1, 0], -sgn * 34) @ rot([1, 0, 0], -14)
        c = np.array([sgn * 74.0, 1684, 10])
        e = (ql - c) @ R
        rr = np.sqrt((e[:, 1] / 33) ** 2 + (e[:, 2] / 21) ** 2)
        for cc in surface_contour(m, rr - 0.62):
            if len(cc) > 3:
                out.append(Line(smooth(cc, 2), 2, P[name].grad(cc), 'ear-rim'))
    # the hairline, low at the nape and up round the ears
    m = P['head'].mesh()
    qh = to_head(P['head'].local(m.vertices))
    for c in surface_contour(m, qh[:, 1] - _hairline(qh)):
        if len(c) > 3:
            out.append(Line(smooth(c, 4), 2, P['head'].grad(c), 'hairline'))
    return out
