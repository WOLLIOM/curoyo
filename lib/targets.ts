// Every formation the particles can take. The snake is not "inspired by" the logo: it is measured from it.
// From the logo pixels we derive: a body mask, a distance field (to edges and spots), a rounded height
// field with surface normals, and a geodesic path running tail -> head along the body.

export const SNAKE_W = 11
export const SNAKE_H = (SNAKE_W * 1024) / 1536
const RELIEF = 0.5

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Two-pass chamfer distance: for every 1-pixel, distance to the nearest 0-pixel.
export function chamfer(mask: Uint8Array, w: number, h: number) {
  const INF = 1e9
  const d = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? INF : 0
  const D = Math.SQRT2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!d[i]) continue
      let v = d[i]
      if (x > 0) v = Math.min(v, d[i - 1] + 1)
      if (y > 0) {
        v = Math.min(v, d[i - w] + 1)
        if (x > 0) v = Math.min(v, d[i - w - 1] + D)
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + D)
      }
      d[i] = v
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (!d[i]) continue
      let v = d[i]
      if (x < w - 1) v = Math.min(v, d[i + 1] + 1)
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 1)
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + D)
        if (x > 0) v = Math.min(v, d[i + w - 1] + D)
      }
      d[i] = v
    }
  }
  return d
}

function grad(f: Float32Array, w: number, h: number, x: number, y: number): [number, number] {
  const i = y * w + x
  const l = x > 0 ? f[i - 1] : f[i]
  const r = x < w - 1 ? f[i + 1] : f[i]
  const u = y > 0 ? f[i - w] : f[i]
  const dn = y < h - 1 ? f[i + w] : f[i]
  return [(r - l) * 0.5, (dn - u) * 0.5]
}

function measureLogo(img: HTMLImageElement, count: number) {
  const w = 720
  const h = Math.round((w * img.height) / img.width)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  ctx.drawImage(img, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data
  const N = w * h

  const body = new Uint8Array(N)
  for (let i = 0; i < N; i++) body[i] = px[i * 4] > 140 ? 1 : 0

  // Background = dark pixels reachable from the border. Everything else is the snake with its spots filled.
  const outside = new Uint8Array(N)
  const stack: number[] = []
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
  while (stack.length) {
    const i = stack.pop() as number
    if (outside[i] || body[i]) continue
    outside[i] = 1
    const x = i % w
    if (x > 0) stack.push(i - 1)
    if (x < w - 1) stack.push(i + 1)
    if (i >= w) stack.push(i - w)
    if (i < N - w) stack.push(i + w)
  }
  const filled = new Uint8Array(N)
  for (let i = 0; i < N; i++) filled[i] = outside[i] ? 0 : 1

  const dBody = chamfer(body, w, h)

  // Geodesic distance along the body, starting at the tail (leftmost point of the snake).
  let tail = -1
  let minX = w
  for (let i = 0; i < N; i++) {
    if (filled[i] && i % w < minX) {
      minX = i % w
      tail = i
    }
  }
  // Dial's algorithm with 2/3 step costs: a near-Euclidean walk, so equal-distance fronts cut straight across the body.
  const G = new Float32Array(N).fill(-1)
  const best = new Int32Array(N).fill(0x7fffffff)
  const buckets: number[][] = []
  const push = (i: number, d: number) => {
    if (d >= best[i]) return
    best[i] = d
    ;(buckets[d] ||= []).push(i)
  }
  push(tail, 0)
  for (let d = 0; d < buckets.length; d++) {
    const list = buckets[d]
    if (!list) continue
    for (const i of list) {
      if (G[i] >= 0 || best[i] !== d) continue
      G[i] = d / 2
      const x = i % w
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue
          const nx = x + ox
          const j = i + oy * w + ox
          if (nx < 0 || nx >= w || j < 0 || j >= N || !filled[j] || G[j] >= 0) continue
          push(j, d + (ox && oy ? 3 : 2))
        }
      }
    }
    buckets[d] = []
  }
  let gMax = 1
  for (let i = 0; i < N; i++) if (G[i] > gMax) gMax = G[i]

  // Cross-sections: every slice of equal distance along the body, with its centre and its sideways direction.
  const SB = Math.floor(gMax) + 1
  const sx0 = new Float64Array(SB)
  const sy0 = new Float64Array(SB)
  const stx = new Float64Array(SB)
  const sty = new Float64Array(SB)
  const sc = new Float64Array(SB)
  for (let i = 0; i < N; i++) {
    if (G[i] < 0) continue
    const b = G[i] | 0
    const x = i % w
    const y = (i / w) | 0
    const [gx, gy] = grad(G, w, h, x, y)
    sx0[b] += x
    sy0[b] += y
    stx[b] += gx
    sty[b] += gy
    sc[b]++
  }
  const cxs = new Float32Array(SB)
  const cys = new Float32Array(SB)
  const nxs = new Float32Array(SB)
  const nys = new Float32Array(SB)
  for (let b = 0; b < SB; b++) {
    let tx = 0
    let ty = 0
    for (let o = -10; o <= 10; o++) {
      const k = b + o
      if (k >= 0 && k < SB) {
        tx += stx[k]
        ty += sty[k]
      }
    }
    const tl = Math.hypot(tx, ty) || 1
    nxs[b] = -ty / tl
    nys[b] = tx / tl
    cxs[b] = sc[b] ? sx0[b] / sc[b] : 0
    cys[b] = sc[b] ? sy0[b] / sc[b] : 0
  }
  const sMax = new Float32Array(SB)
  for (let i = 0; i < N; i++) {
    if (G[i] < 0) continue
    const b = G[i] | 0
    const o = Math.abs((i % w - cxs[b]) * nxs[b] + (((i / w) | 0) - cys[b]) * nys[b])
    if (o > sMax[b]) sMax[b] = o
  }

  // Rounded cross-section: the logo inflates like a soft cast object; spots become dimples.
  let dMax = 0
  for (let i = 0; i < N; i++) if (body[i] && dBody[i] > dMax) dMax = dBody[i]
  const D = dMax * 0.8
  const H = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    if (!body[i]) continue
    const t = Math.min(dBody[i] / D, 1)
    H[i] = Math.sqrt(1 - (1 - t) * (1 - t))
  }

  // Even coverage: walk the body pixels in order and take evenly spaced, jittered samples.
  const list: number[] = []
  for (let i = 0; i < N; i++) if (body[i]) list.push(i)
  const pxW = SNAKE_W / w
  const snake = new Float32Array(count * 4)
  const bodyOut = new Float32Array(count * 4)
  const ring = new Float32Array(count * 4)
  const step = list.length / count
  for (let k = 0; k < count; k++) {
    const i = list[Math.min(list.length - 1, Math.floor((k + Math.random()) * step))]
    const x = i % w
    const y = (i / w) | 0
    const jx = Math.random()
    const jy = Math.random()
    const along = G[i] >= 0 ? G[i] / gMax : x / w

    snake[k * 4] = ((x + jx) / w - 0.5) * SNAKE_W
    snake[k * 4 + 1] = -((y + jy) / h - 0.5) * SNAKE_H
    snake[k * 4 + 2] = 0
    snake[k * 4 + 3] = along

    const [hx, hy] = grad(H, w, h, x, y)
    const sx = (-hx * RELIEF) / pxW
    const sy = (hy * RELIEF) / pxW
    const inv = 1 / Math.hypot(sx, sy, 1)
    bodyOut[k * 4] = sx * inv
    bodyOut[k * 4 + 1] = sy * inv
    bodyOut[k * 4 + 2] = H[i]

    // Ouroboros: position along the body becomes an angle, position across its slice becomes radius.
    let offset = 0
    if (G[i] >= 0) {
      const b = G[i] | 0
      const o = (x + jx - cxs[b]) * nxs[b] + (y + jy - cys[b]) * nys[b]
      offset = Math.max(-1, Math.min(1, o / (sMax[b] || 1)))
    }
    const theta = Math.PI / 2 - along * Math.PI * 2 * 0.985
    const R = 2.55 + offset * 0.55
    ring[k * 4] = Math.cos(theta) * R
    ring[k * 4 + 1] = Math.sin(theta) * R
    ring[k * 4 + 2] = (H[i] - 0.5) * 0.35
  }
  return { snake, body: bodyOut, ring }
}

function toRGBA(xyz: Float32Array, count: number) {
  const out = new Float32Array(count * 4)
  for (let k = 0; k < count; k++) {
    out[k * 4] = xyz[k * 3]
    out[k * 4 + 1] = xyz[k * 3 + 1]
    out[k * 4 + 2] = xyz[k * 3 + 2]
  }
  return out
}

// ---------- Solid objects: even, structured sampling with real surface normals so they can be lit ----------

const GOLDEN = Math.PI * (3 - Math.sqrt(5))

interface Formation {
  pos: Float32Array
  nrm: Float32Array
}

// Slots are spread over particle indices at random, so a formation dissolves evenly when it changes.
function formation(count: number) {
  const perm = new Uint32Array(count)
  for (let i = 0; i < count; i++) perm[i] = i
  for (let i = count - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    const t = perm[i]
    perm[i] = perm[j]
    perm[j] = t
  }
  const f: Formation = { pos: new Float32Array(count * 4), nrm: new Float32Array(count * 4) }
  const put = (slot: number, x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    const k = perm[slot] * 4
    const l = Math.hypot(nx, ny, nz) || 1
    f.pos[k] = x
    f.pos[k + 1] = y
    f.pos[k + 2] = z
    f.nrm[k] = nx / l
    f.nrm[k + 1] = ny / l
    f.nrm[k + 2] = nz / l
    f.nrm[k + 3] = 1
    return k
  }
  return { f, put }
}

function fib(i: number, m: number): [number, number, number] {
  const y = 1 - (2 * (i + 0.5)) / m
  const r = Math.sqrt(Math.max(0, 1 - y * y))
  const a = i * GOLDEN
  return [Math.cos(a) * r, y, Math.sin(a) * r]
}

// A planet with three tilted rings: worlds.
function buildOrbit(count: number) {
  const { f, put } = formation(count)
  const mSphere = Math.round(count * 0.4)
  for (let s = 0; s < mSphere; s++) {
    const [ux, uy, uz] = fib(s, mSphere)
    put(s, ux * 1.05, uy * 1.05, uz * 1.05, ux, uy, uz)
  }
  const radii = [1.9, 2.45, 3.0]
  const total = radii.reduce((a, b) => a + b, 0)
  let slot = mSphere
  radii.forEach((rad, ring) => {
    const n = ring === radii.length - 1 ? count - slot : Math.round(((count - mSphere) * rad) / total)
    const tilt = 0.5 + ring * 0.55
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2
      const band = (((j * 0.6180339) % 1) - 0.5) * 0.07
      const px = Math.cos(a) * (rad + band)
      const pz = Math.sin(a) * (rad + band)
      put(slot++, px, -pz * Math.sin(tilt), pz * Math.cos(tilt), 0, Math.cos(tilt), Math.sin(tilt))
    }
  })
  return f
}

// Cumulus: overlapping puffs on a flat base. Pairs with the cloud-computing credentials.
function buildCloud(count: number) {
  const { f, put } = formation(count)
  const puffs = [
    [-3.4, -0.1, 0.9], [-2.2, 0.35, 1.3], [-0.7, 0.75, 1.6], [0.9, 0.55, 1.45],
    [2.4, 0.15, 1.15], [3.5, -0.2, 0.8], [0.2, -0.1, 1.2],
  ]
  const area = puffs.map((p) => p[2] * p[2])
  const total = area.reduce((a, b) => a + b, 0)
  let slot = 0
  puffs.forEach(([cx, cy, rad], idx) => {
    const n = idx === puffs.length - 1 ? count - slot : Math.round((count * area[idx]) / total)
    for (let j = 0; j < n; j++) {
      const [ux, uy, uz] = fib(j, n)
      const rr = rad * (0.94 + ((j * 0.6180339) % 1) * 0.06)
      let y = cy + rr * uy
      let ny = uy
      if (y < -0.75) {
        y = -0.75 + (y + 0.75) * 0.12
        ny = -1
      }
      put(slot++, cx + rr * ux, y, rr * uz * 0.8, ux, ny, uz * 1.25)
    }
  })
  return f
}

// Two portraits from photographs, side by side. Particle density follows the light, so each image emerges from darkness.
// The second photo is a cutout, so its transparent background stays empty.
async function samplePhoto(src: string, count: number, offsetX: number, height: number, crop: [number, number, number, number] = [0, 0, 1, 1]) {
  const img = await loadImage(src)
  const sx = crop[0] * img.width
  const sy = crop[1] * img.height
  const sw = (crop[2] - crop[0]) * img.width
  const sh = (crop[3] - crop[1]) * img.height
  const w = 480
  const h = Math.round((w * sh) / sw)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data
  const N = w * h
  const lum = new Float32Array(N)
  const cum = new Float64Array(N)
  let total = 0
  for (let i = 0; i < N; i++) {
    const l = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) / 255
    lum[i] = l
    total += Math.pow(Math.max(0, l - 0.1), 2.3) * (px[i * 4 + 3] / 255)
    cum[i] = total
  }
  const W = (height * w) / h
  const out = new Float32Array(count * 4)
  const step = total / count
  let i = 0
  for (let k = 0; k < count; k++) {
    const target = (k + Math.random()) * step
    while (i < N - 1 && cum[i] < target) i++
    const x = i % w
    const y = (i / w) | 0
    out[k * 4] = ((x + Math.random()) / w - 0.5) * W + offsetX
    out[k * 4 + 1] = -((y + Math.random()) / h - 0.5) * height
    out[k * 4 + 2] = (lum[i] - 0.5) * 0.5
    out[k * 4 + 3] = lum[i]
  }
  return { out, width: W }
}

async function buildPortrait(count: number) {
  // The selfie cutout, big: his face and shoulders from darkness. The transparent background stays empty.
  const f = await samplePhoto('/images/selfie-cut.png', count, 0, 6.4, [0.08, 0.2, 0.98, 1])
  return f.out
}

// A spiral galaxy: three arms and a dense core. Stars.
function buildGalaxy(count: number) {
  const out = new Float32Array(count * 3)
  const arms = 3
  for (let k = 0; k < count; k++) {
    let x: number
    let y: number
    let z: number
    if (Math.random() < 0.16) {
      const r = Math.pow(Math.random(), 1.8)
      const a = Math.random() * Math.PI * 2
      x = Math.cos(a) * r
      y = Math.sin(a) * r * 0.6
      z = (Math.random() - 0.5) * 0.5 * (1 - r)
    } else {
      const arm = (Math.random() * arms) | 0
      const t = Math.pow(Math.random(), 0.7)
      const r = 0.5 + t * 4.6
      const a = t * 5.2 + (arm * Math.PI * 2) / arms + (Math.random() - 0.5) * (0.5 / (0.4 + t * 2))
      x = Math.cos(a) * r
      y = Math.sin(a) * r * 0.58
      z = (Math.random() - 0.5) * 0.25
    }
    out[k * 3] = x
    out[k * 3 + 1] = y
    out[k * 3 + 2] = z
  }
  return out
}

// A bamboo grove: five culms with swollen nodes and drooping leaves at the top.
// pos.w = culm index + height along the grove (0..1), so the shader can grow and sway each culm.
export const BAMBOO_BASE = -3.6
export const BAMBOO_SPAN = 7.6
const CULMS = [
  { h: 5.2, r: 0.17, z: 0.4 },
  { h: 6.6, r: 0.2, z: -0.3 },
  { h: 7.4, r: 0.22, z: 0.1 },
  { h: 6.1, r: 0.19, z: -0.5 },
  { h: 4.7, r: 0.16, z: 0.3 },
]
const culmX = (i: number) => -2.6 + i * 1.3
const culmLean = (i: number) => (i - 2) * 0.06

function buildBamboo(count: number) {
  const { f, put } = formation(count)
  const nLeaf = Math.round(count * 0.34)
  const nCulm = count - nLeaf
  const totalH = CULMS.reduce((a, c) => a + c.h, 0)
  let slot = 0
  const pick = () => {
    let r = Math.random() * totalH
    for (let i = 0; i < CULMS.length; i++) {
      r -= CULMS[i].h
      if (r <= 0) return i
    }
    return CULMS.length - 1
  }
  const gap = 0.82
  const write = (ci: number, x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    const k = put(slot++, x, y, z, nx, ny, nz)
    f.pos[k + 3] = ci + Math.min(0.99, Math.max(0, (y - BAMBOO_BASE) / BAMBOO_SPAN))
  }
  // culms with node rings
  for (let k = 0; k < nCulm; k++) {
    const ci = pick()
    const c = CULMS[ci]
    const h = Math.random() * c.h
    const nearest = Math.round(h / gap) * gap
    const dn = h - nearest
    const atNode = Math.random() < 0.22
    const hh = atNode ? nearest + (Math.random() - 0.5) * 0.05 : h
    const bulge = atNode ? 1.3 : 1 + 0.12 * Math.exp(-(dn * dn) / 0.004)
    const a = Math.random() * Math.PI * 2
    const r = c.r * bulge * (1 - (hh / c.h) * 0.35)
    const lean = culmLean(ci) * hh * hh * 0.12
    const y = BAMBOO_BASE + hh
    const x = culmX(ci) + lean + Math.cos(a) * r
    const z = c.z + Math.sin(a) * r
    write(ci, x, y, z, Math.cos(a), atNode ? 0.4 : 0, Math.sin(a))
  }
  // leaves: slim lances on short twigs from the upper nodes, hanging outward
  for (let k = 0; k < nLeaf; k++) {
    const ci = pick()
    const c = CULMS[ci]
    const nodes = Math.floor(c.h / gap)
    const ni = Math.max(2, nodes - 1 - ((Math.pow(Math.random(), 1.6) * Math.min(4, nodes - 2)) | 0))
    const nh = ni * gap
    const leafId = (Math.random() * 7) | 0
    const seed = ci * 31 + ni * 7 + leafId
    const b = seed * 2.399 + Math.sin(seed) * 0.6
    const len = 0.75 + ((seed * 0.618) % 1) * 0.45
    const u = Math.random()
    const v = (Math.random() - 0.5) * 0.2 * Math.sin(Math.PI * Math.pow(u, 0.8))
    const ox = Math.cos(b)
    const oz = Math.sin(b) * 0.7
    const twig = 0.25
    const lean = culmLean(ci) * nh * nh * 0.12
    const x0 = culmX(ci) + lean + ox * twig
    const y0 = BAMBOO_BASE + nh + 0.15
    const z0 = c.z + oz * twig
    const x = x0 + ox * u * len - oz * v
    const y = y0 + 0.18 * u - 0.55 * u * u * len
    const z = z0 + oz * u * len + ox * v
    write(ci, x, y, z, -oz * 0.3, 1, ox * 0.3)
  }
  return f
}

// The Himalaya at night: a real range, carved from ridged noise. A tall main massif behind, a lower front range, sharp
// summits, knife-edge crests and gullies down every face, with a low moon. Home of the red panda.
const hash2 = (x: number, z: number) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function vnoise(x: number, z: number) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)
  const a = hash2(ix, iz)
  const b = hash2(ix + 1, iz)
  const c = hash2(ix, iz + 1)
  const d = hash2(ix + 1, iz + 1)
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz
}
// Ridged multifractal: sharp crests where the noise crosses its middle, each octave weighted by the one above.
function ridged(x: number, z: number, oct: number) {
  let sum = 0
  let amp = 0.5
  let w = 1
  let fx = x
  let fz = z
  for (let i = 0; i < oct; i++) {
    let n = 1 - Math.abs(vnoise(fx, fz) * 2 - 1)
    n *= n
    n *= w
    w = Math.min(1, n * 1.8)
    sum += n * amp
    amp *= 0.5
    // rotate each octave so the ridges never line up on a grid
    const tx = fx * 1.6 - fz * 1.2
    fz = fx * 1.2 + fz * 1.6
    fx = tx + 3.7
  }
  return sum
}

const PEAK_BASE = -2.4
// [x, z, height, width]: the main massif, then the front range.
const MASSIF = [
  [-4.5, -1.0, 2.2, 2.0], [-2.8, -1.3, 3.0, 2.1], [-0.6, -1.5, 4.0, 2.5], [1.1, -1.1, 3.2, 1.9], [2.9, -1.4, 3.3, 2.2], [4.7, -1.1, 2.3, 1.9],
  [-3.5, 0.6, 1.4, 1.9], [-1.1, 0.8, 1.1, 1.7], [1.5, 0.7, 1.6, 2.0], [3.9, 0.6, 1.2, 1.7],
]
function peakHeight(x: number, z: number) {
  // Smooth max of pyramidal peaks, so saddles form between them instead of creases.
  let acc = 0
  for (const [px, pz, ph, pw] of MASSIF) {
    const d = Math.hypot((x - px) / pw, (z - pz) / (pw * 0.8))
    const v = Math.pow(Math.max(0, 1 - d), 1.15) * ph
    acc += Math.exp(v * 3)
  }
  const env = Math.log(acc) / 3 - Math.log(MASSIF.length) / 3
  const e = Math.max(0, env)
  // Carve: big ridges and gullies scale with altitude, fine rock detail everywhere.
  const r1 = ridged(x * 0.85 + 11, z * 0.85, 5)
  const r2 = ridged(x * 2.6 - 4, z * 2.6, 3)
  return PEAK_BASE + e * (0.7 + 0.5 * r1) + r2 * 0.16 * (0.3 + e * 0.35)
}

function buildPeaks(count: number) {
  const { f, put } = formation(count)
  const nMoon = Math.round(count * 0.06)
  const X = 5.6
  const Z0 = -2.6
  const Z1 = 1.8
  const e = 0.015
  let slot = 0
  let guard = 0
  while (slot < count - nMoon && guard++ < count * 40) {
    const x = (Math.random() * 2 - 1) * X
    const z = Z0 + Math.random() * (Z1 - Z0)
    const y = peakHeight(x, z)
    const gx = (peakHeight(x + e, z) - peakHeight(x - e, z)) / (2 * e)
    const gz = (peakHeight(x, z + e) - peakHeight(x, z - e)) / (2 * e)
    const slope = Math.hypot(gx, gz)
    const alt = (y - PEAK_BASE) / 5
    // More grains on steep faces and high up (true surface area, and where the eye goes); the valley floor stays sparse
    // and fades towards the sides so the range ends softly rather than in a hard edge.
    const edge = Math.min(1, (X - Math.abs(x)) / 1.1) * Math.min(1, (Z1 - z) / 0.6)
    const wgt = (0.12 + Math.min(1.6, slope) * 0.55 + alt * 0.9) * edge
    if (Math.random() > wgt * 0.7) continue
    put(slot++, x, y, z, -gx, 1, -gz + 0.25)
  }
  while (slot < count - nMoon) put(slot++, (Math.random() * 2 - 1) * X, PEAK_BASE, 0, 0, 1, 0.3)
  for (let k = 0; k < nMoon; k++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * 0.62
    const nx = Math.cos(a) * r
    const ny = Math.sin(a) * r
    put(slot++, 3.4 + nx, 2.5 + ny, -2.4, nx, ny, Math.sqrt(Math.max(0, 0.4 - r * r)) + 0.3)
  }
  return f
}

// Spaces: a small modern pavilion drawn in grains. A gridded floor, a floating roof slab on slim columns, a wall with an
// arch cut through it, a spiral stair, a glass facade, a still pool, and one object on a plinth. Architecture, interiors,
// products: what the studio makes, in one room.
function buildSpaces(count: number) {
  const { f, put } = formation(count)
  const R = Math.random
  const pts: number[][] = []
  const add = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => pts.push([x, y, z, nx, ny, nz])
  const F = -1.8 // floor
  const T = 1.55 // underside of the roof
  const share = (k: number) => Math.round(count * k)
  // Floor: grid lines plus a light fill.
  for (let i = 0, n = share(0.13); i < n; i++) {
    const along = (R() * 2 - 1)
    const line = Math.round((R() * 2 - 1) * 6) * 0.6
    if (R() < 0.5) add(along * 3.6, F, line * 0.66, 0, 1, 0)
    else add(line, F, along * 2.4, 0, 1, 0)
  }
  for (let i = 0, n = share(0.05); i < n; i++) add((R() * 2 - 1) * 3.6, F, (R() * 2 - 1) * 2.4, 0, 1, 0)
  // Roof slab: a thin box, its edges drawn hard.
  const rx0 = -3.0, rx1 = 3.4, rz0 = -2.0, rz1 = 2.0, ry1 = T + 0.22
  for (let i = 0, n = share(0.16); i < n; i++) {
    const u = R()
    const x = rx0 + R() * (rx1 - rx0)
    const z = rz0 + R() * (rz1 - rz0)
    if (u < 0.45) add(x, ry1, z, 0, 1, 0)
    else if (u < 0.65) add(x, T, z, 0, -1, 0)
    else {
      // the four edges, top and bottom, and the thin sides
      const e = (R() * 4) | 0
      const y = T + R() * 0.22
      if (e === 0) add(x, y, rz1, 0, 0, 1)
      else if (e === 1) add(x, y, rz0, 0, 0, -1)
      else if (e === 2) add(rx1, y, z, 1, 0, 0)
      else add(rx0, y, z, -1, 0, 0)
    }
  }
  // Columns.
  const cols: [number, number][] = []
  for (const cz of [-1.6, 1.6]) for (const cx of [-2.5, -0.9, 0.7, 2.3]) cols.push([cx, cz])
  for (let i = 0, n = share(0.09); i < n; i++) {
    const [cx, cz] = cols[(R() * cols.length) | 0]
    const a = R() * 6.283
    add(cx + Math.cos(a) * 0.07, F + R() * (T - F), cz + Math.sin(a) * 0.07, Math.cos(a), 0, Math.sin(a))
  }
  // Back wall with an arch cut through it.
  for (let i = 0, n = share(0.12); i < n; i++) {
    const x = -3.0 + R() * 3.4
    const y = F + R() * (T - F)
    const ax = x + 1.4
    const inArch = Math.abs(ax) < 0.6 && (y < F + 1.8 || Math.hypot(ax, y - (F + 1.8)) < 0.6)
    if (inArch) continue
    add(x, y, -1.9 + (R() < 0.5 ? 0 : -0.12), 0, 0, 1)
  }
  for (let i = 0, n = share(0.025); i < n; i++) {
    // the arch's reveal, so the opening reads clearly
    const t = R()
    let x: number, y: number
    if (t < 0.3) { x = -2.0; y = F + (t / 0.3) * 1.8 } else if (t < 0.6) { x = -0.8; y = F + ((t - 0.3) / 0.3) * 1.8 } else {
      const a = ((t - 0.6) / 0.4) * Math.PI
      x = -1.4 + Math.cos(a) * 0.6
      y = F + 1.8 + Math.sin(a) * 0.6
    }
    add(x, y, -1.9 - R() * 0.12, 0, 0, 1)
  }
  // Spiral stair up to the roof.
  for (let i = 0, n = share(0.1); i < n; i++) {
    const t = R()
    const step = Math.floor(t * 22)
    const a = step * 0.42
    const y = F + (step / 22) * (T - F)
    const r = 0.1 + R() * 0.62
    const w = (R() - 0.5) * 0.18
    add(2.35 + Math.cos(a + w) * r, y, 0 + Math.sin(a + w) * r, 0, 1, 0)
  }
  for (let i = 0, n = share(0.02); i < n; i++) add(2.35 + (R() - 0.5) * 0.06, F + R() * (T - F), (R() - 0.5) * 0.06, 1, 0, 0)
  // Glass facade: mullions on the right-hand front.
  for (let i = 0, n = share(0.07); i < n; i++) {
    const k = Math.floor(R() * 9)
    if (R() < 0.75) add(0.4 + k * 0.35, F + R() * (T - F), 1.95, 0, 0, 1)
    else add(0.4 + R() * 2.8, F + (Math.floor(R() * 3) + 1) * ((T - F) / 3), 1.95, 0, 0, 1)
  }
  // A still pool in front, outlined, with a few ripples.
  for (let i = 0, n = share(0.06); i < n; i++) {
    const u = R()
    if (u < 0.5) {
      const t = R() * 2 * (2.6 + 1.2)
      const x = t < 2.6 ? -3.4 + t : t < 3.8 ? -0.8 : t < 6.4 ? -0.8 - (t - 3.8) : -3.4
      const z = t < 2.6 ? 0.9 : t < 3.8 ? 0.9 + (t - 2.6) : t < 6.4 ? 2.1 : 2.1 - (t - 6.4)
      add(x, F + 0.02, z, 0, 1, 0)
    } else {
      const a = R() * 6.283
      const r = 0.15 + Math.floor(R() * 3) * 0.17
      add(-2.1 + Math.cos(a) * r, F + 0.02, 1.5 + Math.sin(a) * r * 0.6, 0, 1, 0)
    }
  }
  // The object: a sphere on a plinth, under the roof.
  for (let i = 0, n = share(0.05); i < n; i++) {
    const face = (R() * 5) | 0
    const u = R() - 0.5
    const v = R() - 0.5
    const cx = -0.2, cz = 0.2, h = 0.7, w = 0.6
    if (face === 0) add(cx + u * w, F + h, cz + v * w, 0, 1, 0)
    else if (face === 1) add(cx + w / 2, F + (v + 0.5) * h, cz + u * w, 1, 0, 0)
    else if (face === 2) add(cx - w / 2, F + (v + 0.5) * h, cz + u * w, -1, 0, 0)
    else if (face === 3) add(cx + u * w, F + (v + 0.5) * h, cz + w / 2, 0, 0, 1)
    else add(cx + u * w, F + (v + 0.5) * h, cz - w / 2, 0, 0, -1)
  }
  while (pts.length < count) {
    const [x, y, z] = fib(pts.length * 7919 % 4000, 4000)
    add(-0.2 + x * 0.45, -1.1 + 0.45 + y * 0.45, 0.2 + z * 0.45, x, y, z)
  }
  // Seen from three-quarters and a little above.
  const yaw = -0.55
  const pitch = 0.32
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
  const rot = (x: number, y: number, z: number): [number, number, number] => {
    const x1 = x * cy + z * sy
    const z1 = -x * sy + z * cy
    return [x1, y * cp - z1 * sp, y * sp + z1 * cp]
  }
  for (let i = 0; i < count; i++) {
    const [x, y, z, nx, ny, nz] = pts[i]
    const [px, py, pz] = rot(x, y + 0.1, z)
    const [qx, qy, qz] = rot(nx, ny, nz)
    put(i, px, py, pz, qx, qy, qz + 0.2)
  }
  return f
}

function buildScatter(count: number, rx: number, ry: number, rz: number, base: number) {
  const out = new Float32Array(count * 4)
  for (let k = 0; k < count; k++) {
    const th = Math.acos(1 - 2 * Math.random())
    const ph = Math.random() * Math.PI * 2
    const r = base + Math.random()
    out[k * 4] = r * Math.sin(th) * Math.cos(ph) * rx
    out[k * 4 + 1] = r * Math.cos(th) * ry
    out[k * 4 + 2] = r * Math.sin(th) * Math.sin(ph) * rz
    out[k * 4 + 3] = 1
  }
  return out
}

function randoms(count: number) {
  const rand = new Float32Array(count * 4)
  for (let i = 0; i < rand.length; i++) rand[i] = Math.random()
  return rand
}

// ---------- Loading: the snake first (instant), everything else quietly afterwards ----------

export interface Core {
  size: number
  count: number
  snake: Float32Array
  body: Float32Array
  ring: Float32Array
  rand: Float32Array
  scatter: Float32Array
}

export async function buildCore(size: number): Promise<Core> {
  const count = size * size
  const img = await loadImage('/snake.png')
  const { snake, body, ring } = measureLogo(img, count)
  return { size, count, snake, body, ring, rand: randoms(count), scatter: buildScatter(count, 6, 3.6, 3.6, 3.5 / 6) }
}

export type FormationName = 'apple' | 'tree' | 'bamboo' | 'peaks' | 'spaces' | 'cradle' | 'orbit' | 'cloud' | 'galaxy' | 'portrait'

// Baked models: world size of the longest side, and where each sits.
const MODEL_SCALE: Record<string, number> = { apple: 3.7, tree: 8.2, cradle: 5.8 }
export const CRADLE_PIVOT_Y = 0.459 * MODEL_SCALE.cradle

async function loadModel(name: string, count: number) {
  const res = await fetch(`/models/${name}.bin`)
  if (!res.ok) throw new Error(`model ${name} ${res.status}`)
  const buf = await res.arrayBuffer()
  const a = new Int16Array(buf, 0, Math.floor(buf.byteLength / 16) * 8)
  let total = a.length / 8
  if (total < 1) throw new Error(`model ${name} empty`)
  const sc = MODEL_SCALE[name]
  // The baked tree model is a row of three trees; keep only the middle one and scale it up to fill the room.
  let keep: number[] | null = null
  const treeX = (i: number) => (a[i * 8] / 32767) * sc
  if (name === 'tree') {
    keep = []
    for (let i = 0; i < total; i++) if (Math.abs(treeX(i) - 0.5) < 1.9) keep.push(i)
    total = keep.length
  }
  const ox = name === 'tree' ? 0.5 : 0
  const ms = name === 'tree' ? 2 : 1
  const pos = new Float32Array(count * 4)
  const nrm = new Float32Array(count * 4)
  for (let k = 0; k < count; k++) {
    const i = (keep ? keep[k % total] : k % total) * 8
    pos[k * 4] = ((a[i] / 32767) * sc - ox) * ms
    pos[k * 4 + 1] = (a[i + 1] / 32767) * sc * ms
    pos[k * 4 + 2] = (a[i + 2] / 32767) * sc * ms
    pos[k * 4 + 3] = a[i + 6] // tag (cradle)
    nrm[k * 4] = a[i + 3] / 32767
    nrm[k * 4 + 1] = a[i + 4] / 32767
    nrm[k * 4 + 2] = a[i + 5] / 32767
    nrm[k * 4 + 3] = (a[i + 7] / 32767) * sc // pivot x (cradle)
  }
  return { pos, nrm }
}

// Returns the positions (and normals where the object is lit) for one formation.
export async function buildFormation(name: FormationName, size: number): Promise<{ pos: Float32Array; nrm?: Float32Array }> {
  const count = size * size
  switch (name) {
    case 'apple':
    case 'tree':
    case 'cradle':
      return loadModel(name, count)
    case 'bamboo': {
      const f = buildBamboo(count)
      return { pos: f.pos, nrm: f.nrm }
    }
    case 'peaks': {
      const f = buildPeaks(count)
      return { pos: f.pos, nrm: f.nrm }
    }
    case 'spaces': {
      const f = buildSpaces(count)
      return { pos: f.pos, nrm: f.nrm }
    }
    case 'orbit': {
      const f = buildOrbit(count)
      return { pos: f.pos, nrm: f.nrm }
    }
    case 'cloud': {
      const f = buildCloud(count)
      return { pos: f.pos, nrm: f.nrm }
    }
    case 'galaxy':
      return { pos: toRGBA(buildGalaxy(count), count) }
    case 'portrait':
      return { pos: await buildPortrait(count) }
  }
}

// ---------- The wordmark, measured the same way: letters with their spots as real holes ----------

export const WM_RELIEF = 0.045

export interface WordmarkData {
  size: number
  count: number
  aspect: number
  pos: Float32Array // x, y, 0, along (left -> right)
  body: Float32Array // normal.x, normal.y, height, 0
  rand: Float32Array
  scatter: Float32Array
}

// Measures any light-on-transparent mark (the wordmark image, or a headline drawn to a canvas):
// even samples over the glyphs, a rounded height field and surface normals.
export function measureMark(src: CanvasImageSource, srcW: number, srcH: number, count: number, relief = WM_RELIEF) {
  const w = Math.min(1100, Math.max(400, srcW))
  const h = Math.max(1, Math.round((w * srcH) / srcW))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  ctx.drawImage(src, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data
  const N = w * h
  const mask = new Uint8Array(N)
  for (let i = 0; i < N; i++) mask[i] = px[i * 4 + 3] > 128 ? 1 : 0
  const d = chamfer(mask, w, h)
  let dMax = 0
  for (let i = 0; i < N; i++) if (mask[i] && d[i] > dMax) dMax = d[i]
  const D = Math.max(1, dMax * 0.85)
  const H = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    if (!mask[i]) continue
    const t = Math.min(d[i] / D, 1)
    H[i] = Math.sqrt(1 - (1 - t) * (1 - t))
  }
  const list: number[] = []
  for (let i = 0; i < N; i++) if (mask[i]) list.push(i)
  const pos = new Float32Array(count * 4)
  const body = new Float32Array(count * 4)
  if (!list.length) return { pos, body, aspect: h / w, fill: 0 }
  const step = list.length / count
  const pxW = 1 / w
  for (let k = 0; k < count; k++) {
    const i = list[Math.min(list.length - 1, Math.floor((k + Math.random()) * step))]
    const x = i % w
    const y = (i / w) | 0
    pos[k * 4] = (x + Math.random()) / w - 0.5
    pos[k * 4 + 1] = -((y + Math.random()) / h - 0.5) * (h / w)
    pos[k * 4 + 3] = x / w
    const [hx, hy] = grad(H, w, h, x, y)
    const sx = (-hx * relief) / pxW
    const sy = (hy * relief) / pxW
    const inv = 1 / Math.hypot(sx, sy, 1)
    body[k * 4] = sx * inv
    body[k * 4 + 1] = sy * inv
    body[k * 4 + 2] = H[i]
  }
  return { pos, body, aspect: h / w, fill: list.length / N }
}

export function markScatter(count: number) {
  return buildScatter(count, 1.1, 0.7, 0.5, 0.6)
}
export function markRandoms(count: number) {
  return randoms(count)
}

export async function buildWordmarkData(size: number): Promise<WordmarkData> {
  const count = size * size
  const img = await loadImage('/wordmark.png')
  const { pos, body, aspect } = measureMark(img, img.width, img.height, count)
  return { size, count, aspect, pos, body, rand: randoms(count), scatter: buildScatter(count, 1.1, 0.7, 0.5, 0.6) }
}
