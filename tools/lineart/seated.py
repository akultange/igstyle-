"""The guest, seated, for the closing card's drawing (tools/lineart/guest.py): the man of figure.py settled into the
club chair of chester.py, facing out of its front (+z in the chair's frame), leaning into its back, each forearm laid
along an arm's roll; his right hand over the scroll with a cigar between two fingers, his left resting on the other.
Only what shows above and beside the chair is modelled with care: the head, the collars, the shoulders and upper back
of the jacket, the arms. Millimetres, in the chair's own frame.
"""
import math

import numpy as np

import figure as fg
import chester as cz
from engine import Field, Line, rot, sd_round_box, sd_round_cone, sd_chain, sd_ellipsoid, smin, smax, smooth, surface_contour

# where his standing self's frame sits in the chair's: turned to face the chair's front, lowered into the seat
DROP = 418.0            # the standing figure's neck base (1518) comes down to 1100
BACK = -168.0           # his neck base this far behind the chair's centre
LEAN = 9.0              # he leans back into the chair, degrees, about his hips
_LR = rot([1, 0, 0], -LEAN)
HIP = np.array([0.0, 560, -120])


def to_fig(p):
    """Points in the chair's frame to the standing figure's own frame (where figure.py's shapes are defined)."""
    q = (p - HIP) @ _LR + HIP                   # undo the lean
    x, y, z = q[:, 0], q[:, 1], q[:, 2]
    return np.stack([-x, y + DROP, -(z - BACK) + fg.NECK_B[2]], -1)


def from_fig(q):
    x, y, z = q[:, 0], q[:, 1], q[:, 2]
    p = np.stack([-x, y - DROP, -(z - fg.NECK_B[2]) + BACK], -1)
    return (p - HIP) @ _LR.T + HIP


# his arms, in the chair's frame: upper arms down to elbows on the rolls, forearms along them
SH_R, SH_L = from_fig(fg.SH_R[None])[0], from_fig(fg.SH_L[None])[0]     # (his right is -x in the chair's frame)
ELB_R = np.array([-cz.ARM_C + 14, cz.TOP + 52, -70.0])
WRI_R = np.array([-cz.ARM_C + 6, cz.TOP + 46, cz.FRONT - 150])
ELB_L = np.array([cz.ARM_C - 18, cz.TOP + 54, -40.0])
WRI_L = np.array([cz.ARM_C - 4, cz.TOP + 48, cz.FRONT - 132])


def jacket(p):
    d = fg.jacket_body_plain(to_fig(p))
    return d


def sleeve_r(p):
    return fg.sleeve(p, SH_R, ELB_R, WRI_R, r=(62, 56, 48))


def sleeve_l(p):
    return fg.sleeve(p, SH_L, ELB_L, WRI_L, r=(62, 56, 48))


def cuff(p, el, wr):
    return fg.shirt_cuff(p, el, wr)


def hand_cigar(p):
    """His left hand over the scroll: the back of the hand up, the fingers curled down over the arm's front, the
    cigar held between the first two, pointing out and forward."""
    ax = WRI_L - ELB_L; ax /= np.linalg.norm(ax)           # along the forearm, forward
    up = np.array([0, 1.0, 0]); up -= ax * (up @ ax); up /= np.linalg.norm(up)
    side = np.cross(ax, up)                                 # across the hand
    def P(a, u, s):
        return WRI_L + a * ax + u * up + s * side
    R = np.column_stack([side, up, ax])
    d = sd_round_box(p, P(48, 2, 0), (38, 13, 44), 11, R)                                  # the back of the hand
    d = smin(d, sd_round_cone(p, P(-14, 0, 0), P(16, 0, 0), 32, 35), 14)                 # the wrist
    for i, s in enumerate((-25, -9, 7, 22)):                                               # the fingers, curled down
        L = (44, 54, 58, 52)[i]
        a0, a1 = P(90, 0, s), P(90 + L * .5, -12, s)
        a2, a3 = P(90 + L * .72, -34, s * .97), P(90 + L * .7, -52, s * .94)
        r = (8.6, 9.2, 9.4, 8.8)[i]
        d = smin(d, sd_chain(p, [a0, a1, a2, a3], [r, r * .93, r * .86, r * .8], 5), 5)
    t0, t1, t2 = P(34, -14, -34), P(64, -24, -42), P(88, -32, -38)                         # the thumb, under
    d = smin(d, sd_chain(p, [t0, t1, t2], [13, 11, 9.5], 6), 9)
    return d


def cigar_axis():
    ax = WRI_L - ELB_L; ax /= np.linalg.norm(ax)
    up = np.array([0, 1.0, 0]); up -= ax * (up @ ax); up /= np.linalg.norm(up)
    side = np.cross(ax, up)
    a = WRI_L + 104 * ax - 14 * up - 22 * side                                              # held between the fingers
    d = -side * 0.86 + ax * 0.42 + up * 0.16                                                # out to his side, a little forward and up
    d /= np.linalg.norm(d)
    return a - d * 40, a + d * 118                                                           # the head and the lit foot


def cigar(p):
    a, b = cigar_axis()
    return smax(sd_round_cone(p, a, b, 9.5, 10.5), ((p - b) @ ((b - a) / np.linalg.norm(b - a))), 1)


def hand_rest(p):
    """His right hand, at rest on the other scroll: flat, the fingers over the edge."""
    ax = WRI_R - ELB_R; ax /= np.linalg.norm(ax)
    up = np.array([0, 1.0, 0]); up -= ax * (up @ ax); up /= np.linalg.norm(up)
    side = np.cross(ax, up)
    def P(a, u, s):
        return WRI_R + a * ax + u * up + s * side
    R = np.column_stack([side, up, ax])
    d = sd_round_box(p, P(48, 0, 0), (38, 12, 44), 11, R)
    d = smin(d, sd_round_cone(p, P(-14, 0, 0), P(16, 0, 0), 32, 35), 14)
    for i, s in enumerate((22, 7, -9, -25)):
        L = (44, 54, 58, 52)[i]
        a0, a1, a2 = P(90, 0, s), P(90 + L * .55, -8, s), P(90 + L * .8, -30, s)
        r = (8.6, 9.2, 9.4, 8.8)[i]
        d = smin(d, sd_chain(p, [a0, a1, a2], [r, r * .9, r * .82], 5), 5)
    return d


# his head in this chair: looking straight at the light, a touch to his left (so the edge of his cheek shows)
fg._HR = rot([0, 1, 0], 7.0) @ rot([1, 0, 0], 2.0) @ rot([0, 0, 1], -1.5)


def head(p):
    return fg.head(to_fig(p))


def hair(p):
    return fg.hair(to_fig(p))


def ear(p, s):
    return fg.ear(to_fig(p), s)


def collar(p):
    return fg.collar(to_fig(p))


def shirt_collar(p):
    return fg.shirt_collar(to_fig(p))


def parts():
    out = []
    def F(name, f, lo, hi, step):
        out.append((name, Field(f, lo, hi, step, name)))
    F('m_jacket', jacket, [-330, 640, -460], [330, 1200, 160], 3.5)
    F('m_sleeve_r', sleeve_r, [-520, 700, -320], [-80, 1180, 360], 3.0)
    F('m_sleeve_l', sleeve_l, [80, 700, -320], [520, 1180, 360], 3.0)
    F('m_cuff_r', lambda p: cuff(p, ELB_R, WRI_R), [-470, 740, 120], [-300, 860, 330], 1.5)
    F('m_cuff_l', lambda p: cuff(p, ELB_L, WRI_L), [300, 740, 140], [470, 860, 340], 1.5)
    F('m_hand_r', hand_rest, [-480, 680, 220], [-280, 860, 470], 1.6)
    F('m_hand_l', hand_cigar, [280, 680, 230], [480, 860, 470], 1.6)
    F('m_cigar', cigar, [200, 700, 200], [620, 900, 620], 1.0)
    F('m_collar', collar, [-110, 1060, -300], [110, 1200, -60], 2.0)
    F('m_shirt', shirt_collar, [-100, 1070, -300], [100, 1210, -60], 2.0)
    F('m_head', head, [-130, 1060, -330], [130, 1460, 0], 2.0)
    F('m_hair', hair, [-120, 1180, -320], [120, 1460, -20], 1.5)
    F('m_ear_r', lambda p: ear(p, 1), [-130, 1200, -300], [130, 1340, -40], 1.0)
    F('m_ear_l', lambda p: ear(p, -1), [-130, 1200, -300], [130, 1340, -40], 1.0)
    return out


def details(P):
    """His seams, edges, folds, hair; the cigar's band. P: name -> placed field (in the world)."""
    out = []

    def on(name, fn, keep=None, w=2, sm=3, tag=''):
        m = P[name].mesh()
        loc = P[name].local(m.vertices)
        for c in surface_contour(m, fn(loc)):
            runs = [c]
            if keep is not None:
                mask = keep(P[name].local(c))
                runs, cur = [], []
                for pt, k in zip(c, mask):
                    if k:
                        cur.append(pt)
                    elif cur:
                        runs.append(np.array(cur)); cur = []
                if cur:
                    runs.append(np.array(cur))
            for r in runs:
                if len(r) > 3:
                    r = smooth(np.asarray(r), sm)
                    out.append(Line(r, w, P[name].grad(r), tag or name))

    F = to_fig
    # the collars' top edges
    on('m_collar', lambda q: (F(q) - np.array([0, 1568, 18])) @ np.array([0, 0.97, 0.24]) + 1.6, w=1, tag='collar-edge')
    on('m_shirt', lambda q: (F(q) - np.array([0, 1586, 14])) @ np.array([0, 0.965, 0.26]) + 1.2, w=1, tag='shirt-edge')
    # the back seam, down the middle from the collar
    on('m_jacket', lambda q: F(q)[:, 0], keep=lambda q: (F(q)[:, 2] > 40) & (F(q)[:, 1] < 1536), tag='back-seam')
    # the side bodies' seams, up to the armholes
    for sgn in (1, -1):
        on('m_jacket', lambda q, sgn=sgn: sgn * F(q)[:, 0] - (148 + 0.02 * (F(q)[:, 1] - 1300)),
           keep=lambda q: (F(q)[:, 2] > 30) & (F(q)[:, 1] < 1385), tag='side-body')
    # across the shoulder blades: the jacket eased over them, one shallow fold
    on('m_jacket', lambda q: F(q)[:, 1] - (1338 - 9 * (1 - (F(q)[:, 0] / 150) ** 2)),
       keep=lambda q: (F(q)[:, 2] > 60) & (np.abs(F(q)[:, 0]) < 112), w=3, tag='back-fold')
    # the sleeves: their back seams, and the folds where each arm bends and lies along the roll
    for name, sh, el, wr in (('m_sleeve_r', SH_R, ELB_R, WRI_R), ('m_sleeve_l', SH_L, ELB_L, WRI_L)):
        a1 = (el - sh) / np.linalg.norm(el - sh)
        a2 = (wr - el) / np.linalg.norm(wr - el)
        out_dir = np.array([np.sign(el[0]), 0.35, -0.6]); out_dir /= np.linalg.norm(out_dir)
        for t, tilt, span, ax in ((-70, .3, .45, a1), (-36, -.22, .6, a1), (-12, .18, .5, a1), (30, .25, .55, a2), (70, -.2, .45, a2), (118, .15, .35, a2)):
            c = el + ax * t
            on(name, lambda q, c=c, ax=ax, tilt=tilt: (q - c) @ ax + tilt * ((q - c) @ np.array([0, 1.0, 0])),
               keep=lambda q, c=c, span=span: ((q - c) @ out_dir) > (1 - span) * 50, w=2, sm=2, tag='sleeve-fold')
        side = np.cross(a1, np.array([0, 1.0, 0])); side /= np.linalg.norm(side)
        on(name, lambda q, sh=sh, side=side: (q - sh) @ side * np.sign(sh[0]) + 24,
           keep=lambda q, sh=sh: (q[:, 2] < sh[2] + 40) & (q[:, 1] < sh[1] - 50), tag='sleeve-seam')
    # the cigar's band, near its head
    a, b = cigar_axis()
    ax = (b - a) / np.linalg.norm(b - a)
    for t in (34, 46):
        on('m_cigar', lambda q, t=t: (q - a) @ ax - t, w=2, sm=1, tag='cigar-band')
    # the hair: combed back from the crown and down to the nape
    rng = np.random.default_rng(11)
    hm = P['m_hair'].mesh()
    hv = hm.vertices
    hq = fg.to_head(F(P['m_hair'].local(hv)))
    crown = np.array([0, 1792, 34.0])
    dc = np.linalg.norm((hq - crown) * np.array([1, 0.6, 1]), axis=1)
    cand = np.where((hq[:, 1] > fg._hairline(hq) + 8) & (dc > 34))[0]
    for k in rng.choice(cand, size=min(230, len(cand)), replace=False):
        pt = hv[k].copy()
        pts = [pt]
        for _ in range(int(rng.uniform(16, 34) / 2.5)):
            qh = fg.to_head(F(P['m_hair'].local(pt[None])))[0]
            away = qh - crown
            away[1] = 0
            nrm = np.linalg.norm(away)
            dloc = np.array([0, -1.0, 0]) + (0.55 * away / nrm if nrm > 1e-6 else 0)
            qh2 = qh + dloc * 2.5
            pt = P['m_hair'].world(from_fig(fg.from_head(qh2[None])))[0]
            pt = P['m_hair'].snap(pt[None], 2)[0]
            qq = fg.to_head(F(P['m_hair'].local(pt[None])))
            if qq[0, 1] < fg._hairline(qq)[0] + 2:
                break
            pts.append(pt)
        if len(pts) > 3:
            pts = np.array(pts)
            out.append(Line(smooth(pts, 2), 3, P['m_hair'].grad(pts), 'hair'))
    # the ears' rims
    for sgn, name in ((1, 'm_ear_r'), (-1, 'm_ear_l')):
        m = P[name].mesh()
        ql = fg.HEAD_PIVOT + (fg.to_head(F(P[name].local(m.vertices))) - fg.HEAD_PIVOT) / fg.HEAD_S
        R = rot([0, 1, 0], -sgn * 38) @ rot([1, 0, 0], -14)
        c = np.array([sgn * 77.0, 1684, 12])
        e = (ql - c) @ R
        rr = np.sqrt((e[:, 1] / 34) ** 2 + (e[:, 2] / 22) ** 2)
        for cc in surface_contour(m, rr - 0.62):
            if len(cc) > 3:
                out.append(Line(smooth(cc, 2), 2, P[name].grad(cc), 'ear-rim'))
    # the hairline
    m = P['m_head'].mesh()
    qh = fg.to_head(F(P['m_head'].local(m.vertices)))
    for c in surface_contour(m, qh[:, 1] - fg._hairline(qh)):
        if len(c) > 3:
            out.append(Line(smooth(c, 4), 2, P['m_head'].grad(c), 'hairline'))
    return out
