"""Bake GLB models into compact particle files (int16 x,y,z,nx,ny,nz,tag,pivot) for the site.

Usage: python scripts/bake-models.py
Sources are read from the noroyo folder and Downloads; output goes to public/models.
"""
import os
import numpy as np
import trimesh

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = {
    'apple': r'C:/Users/SimonMaxam/Documents/noroyo/apple.glb',
    'tree': r'C:/Users/SimonMaxam/Documents/noroyo/tree_animate.glb',
    'cradle': r'C:/Users/SimonMaxam/Documents/noroyo/newtons_cradle.glb',
    'phone': r'C:/Users/SimonMaxam/Downloads/apple_iphone_duo_fold_night_sky_2026_animated.glb',
}
N = 36864  # 192 * 192, the largest simulation size
rng = np.random.default_rng(7)


def parts(path):
    sc = trimesh.load(path, force='scene')
    out = []
    for node in sc.graph.nodes_geometry:
        T, g = sc.graph[node]
        m = sc.geometry[g].copy()
        m.apply_transform(T)
        out.append((node, m))
    return out


def sample(meshes, n, weights=None):
    areas = np.array([max(m.area, 1e-12) for _, m in meshes])
    if weights is not None:
        areas = areas * np.array(weights)
    share = areas / areas.sum()
    counts = np.floor(share * n).astype(int)
    counts[np.argmax(share)] += n - counts.sum()
    pts, nrm, tag = [], [], []
    for (name, m), c in zip(meshes, counts):
        if c <= 0:
            continue
        p, fi = trimesh.sample.sample_surface(m, c, seed=int(rng.integers(1 << 30)))
        pts.append(p)
        nrm.append(m.face_normals[fi])
        tag.append(np.full(c, hash_name(name), dtype=np.int32))
    return np.vstack(pts), np.vstack(nrm), np.concatenate(tag)


def hash_name(name):
    return 0


def normalise(p, size_axis=None):
    lo, hi = p.min(0), p.max(0)
    c = (lo + hi) / 2
    scale = (hi - lo).max()
    return (p - c) / scale, scale, c


def write(name, p, nrm, tag=None, pivot=None):
    p = np.clip(p, -1, 1)
    q = np.zeros((len(p), 8), dtype=np.int16)
    q[:, 0:3] = np.round(p * 32767)
    q[:, 3:6] = np.round(nrm * 32767)
    if tag is not None:
        q[:, 6] = tag
    if pivot is not None:
        q[:, 7] = np.round(np.clip(pivot, -1, 1) * 32767)
    perm = rng.permutation(len(p))
    q = q[perm]
    os.makedirs(os.path.join(ROOT, 'public', 'models'), exist_ok=True)
    path = os.path.join(ROOT, 'public', 'models', name + '.bin')
    q.tofile(path)
    print(name, len(p), os.path.getsize(path) // 1024, 'KB')


# apple: real surface, as scanned
m = parts(SRC['apple'])
p, n, _ = sample(m, N)
p, s, c = normalise(p)
write('apple', p, n)

# tree: three animated trees; bark and branches get extra weight so the silhouette stays legible
m = parts(SRC['tree'])
w = [1.0 if nm == 'Object_4' else 0.35 for nm, _ in m]
p, n, _ = sample(m, N, weights=None)
p, s, c = normalise(p)
write('tree', p, n)

# newton's cradle: balls are tagged 0..4 (left to right) so the shader can swing the end balls
meshes = parts(SRC['cradle'])
balls = sorted([(nm, mm) for nm, mm in meshes if 'Ball' in nm or 'Wire' in nm or 'Hook' in nm], key=lambda t: t[1].bounds[:, 0].mean())
frame = [(nm, mm) for nm, mm in meshes if not ('Ball' in nm or 'Wire' in nm or 'Hook' in nm)]
frame = [(nm, mm) for nm, mm in frame if 'Flor' not in nm]
allm = frame + balls
allp = np.vstack([mm.vertices for _, mm in allm])
lo, hi = allp.min(0), allp.max(0)
cen = (lo + hi) / 2
scale = (hi - lo).max()
top_y = max(mm.bounds[1, 1] for _, mm in balls)
P, Nn, T, PV = [], [], [], []
count_frame = int(N * 0.38)
pf, nf, _ = sample(frame, count_frame)
P.append(pf)
Nn.append(nf)
T.append(np.full(len(pf), 5))
PV.append(np.zeros(len(pf)))
# group by pendulum: each wire and hook belongs to the nearest ball
ball_x = sorted(float(mm.bounds[:, 0].mean()) for nm, mm in balls if 'Ball' in nm)
groups = {i: [] for i in range(len(ball_x))}
for nm, mm in balls:
    cx = float(mm.bounds[:, 0].mean())
    i = int(np.argmin([abs(cx - bx) for bx in ball_x]))
    groups[i].append((nm, mm))
keys = sorted(groups)  # 0..4, left to right
rest = N - count_frame
for idx, k in enumerate(keys):
    cnt = rest // len(keys) + (rest % len(keys) if idx == 0 else 0)
    # balls dominate: weight them so they read as solid spheres
    gm = groups[k]
    wts = [6.0 if 'Ball' in nm else 1.0 for nm, _ in gm]
    pp, nn, _ = sample(gm, cnt, weights=wts)
    P.append(pp)
    Nn.append(nn)
    T.append(np.full(len(pp), idx))
    PV.append(np.full(len(pp), (ball_x[k] - cen[0]) / scale))
p = (np.vstack(P) - cen) / scale
write('cradle', p, np.vstack(Nn), np.concatenate(T), np.concatenate(PV))
print('cradle pivot y', (top_y - cen[1]) / scale, 'tags', len(keys))

# phone: whichever pose the file rests in
m = parts(SRC['phone'])
p, n, _ = sample(m, N)
p, s, c = normalise(p)
write('phone', p, n)
