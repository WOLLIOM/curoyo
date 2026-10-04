'use client'

import { useEffect, useRef } from 'react'

// A small turning object made of points for a certificate: the cloud for AWS, a neural net for AI, and so on.
// It follows the site's grain: the same dots, the same rust, and it spins faster when you reach for it.
export type ObjKind = 'cloud' | 'neural' | 'gear' | 'chart' | 'git' | 'cpp' | 'data' | 'guitar' | 'brain' | 'pizza' | 'bowl' | 'python'

type P = [number, number, number, number?] // x, y, z, and 1 for the accent colour
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

function line(a: P, b: P, n: number, out: P[]) {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t])
  }
}
function ball(c: P, r: number, n: number, out: P[]) {
  for (let i = 0; i < n; i++) {
    const u = rnd(-1, 1)
    const a = rnd(0, 6.283)
    const s = Math.sqrt(1 - u * u)
    out.push([c[0] + r * s * Math.cos(a), c[1] + r * u, c[2] + r * s * Math.sin(a)])
  }
}
function box(c: P, w: number, h: number, d: number, n: number, out: P[]) {
  for (let i = 0; i < n; i++) {
    const face = Math.floor(rnd(0, 6))
    let x = rnd(-1, 1)
    let y = rnd(-1, 1)
    let z = rnd(-1, 1)
    if (face === 0) x = -1
    else if (face === 1) x = 1
    else if (face === 2) y = -1
    else if (face === 3) y = 1
    else if (face === 4) z = -1
    else z = 1
    out.push([c[0] + (x * w) / 2, c[1] + (y * h) / 2, c[2] + (z * d) / 2])
  }
}

function build(kind: ObjKind): P[] {
  const out: P[] = []
  if (kind === 'cloud') {
    const bs: [P, number][] = [[[-0.62, -0.1, 0], 0.42], [[-0.2, 0.18, 0], 0.55], [[0.32, 0.05, 0], 0.5], [[0.7, -0.15, 0], 0.34], [[0.05, -0.05, 0.3], 0.4], [[0.1, -0.05, -0.3], 0.4]]
    let guard = 0
    while (out.length < 700 && guard++ < 20000) {
      const [c, r] = bs[Math.floor(rnd(0, bs.length))]
      const u = rnd(-1, 1)
      const a = rnd(0, 6.283)
      const s = Math.sqrt(1 - u * u)
      const p: P = [c[0] + r * s * Math.cos(a), c[1] + r * u, c[2] + r * s * Math.sin(a)]
      if (p[1] < -0.42) continue
      if (bs.some(([c2, r2]) => c2 !== c && Math.hypot(p[0] - c2[0], p[1] - c2[1], p[2] - c2[2]) < r2 * 0.96)) continue
      out.push(p)
    }
    line([-0.75, -0.42, 0], [0.85, -0.42, 0], 40, out)
  } else if (kind === 'neural') {
    const layers = [3, 5, 5, 2]
    const nodes: P[][] = layers.map((n, li) => Array.from({ length: n }, (_, i) => [(li - 1.5) * 0.62, ((n - 1) / 2 - i) * 0.34, 0] as P))
    nodes.forEach((l) => l.forEach((p) => ball(p, 0.07, 18, out)))
    for (let li = 0; li < nodes.length - 1; li++) for (const a of nodes[li]) for (const b of nodes[li + 1]) line(a, b, 7, out)
  } else if (kind === 'gear') {
    const teeth = 10
    for (let i = 0; i < 520; i++) {
      const th = rnd(0, 6.283)
      const tooth = Math.sin(th * teeth) > 0 ? 0.2 : 0
      const face = Math.random()
      const z = face < 0.4 ? -0.14 : face < 0.8 ? 0.14 : rnd(-0.14, 0.14)
      const r = face < 0.8 ? rnd(0.3, 0.78 + tooth) : 0.78 + tooth
      out.push([Math.cos(th) * r, Math.sin(th) * r, z])
    }
    for (let i = 0; i < 40; i++) {
      const th = (i / 40) * 6.283
      out.push([Math.cos(th) * 0.3, Math.sin(th) * 0.3, rnd(-0.14, 0.14)])
    }
  } else if (kind === 'chart') {
    // A dashboard: growing bars, a trend line climbing over them in the accent colour, and a baseline.
    const hs = [0.45, 0.7, 0.62, 1.0, 1.3]
    hs.forEach((h, i) => box([(i - 2) * 0.36, -0.7 + h / 2, 0], 0.24, h, 0.24, 80, out))
    line([-0.95, -0.7, 0.3], [0.95, -0.7, 0.3], 40, out)
    const tops: P[] = hs.map((h, i) => [(i - 2) * 0.36, -0.7 + h + 0.18, 0.2])
    for (let i = 0; i < tops.length - 1; i++) for (let k = 0; k < 16; k++) {
      const t = k / 15
      out.push([tops[i][0] + (tops[i + 1][0] - tops[i][0]) * t, tops[i][1] + (tops[i + 1][1] - tops[i][1]) * t, 0.2, 1])
    }
    tops.forEach((p) => {
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * 6.283
        out.push([p[0] + Math.cos(a) * 0.05, p[1] + Math.sin(a) * 0.05, 0.2, 1])
      }
    })
    // An arrow head on the last point: up and to the right.
    const e = tops[tops.length - 1]
    line([e[0] + 0.14, e[1] + 0.14, 0.2, 1], [e[0] - 0.02, e[1] + 0.14, 0.2], 8, out)
    line([e[0] + 0.14, e[1] + 0.14, 0.2, 1], [e[0] + 0.14, e[1] - 0.02, 0.2], 8, out)
    out.slice(-16).forEach((p) => (p[3] = 1))
  } else if (kind === 'python') {
    // The two interlocked snakes of the Python logo, one in each colour, each with its eye.
    const cv = document.createElement('canvas')
    cv.width = 160
    cv.height = 160
    const c = cv.getContext('2d')
    if (c) {
      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        c.beginPath()
        c.moveTo(x + r, y)
        c.arcTo(x + w, y, x + w, y + h, r)
        c.arcTo(x + w, y + h, x, y + h, r)
        c.arcTo(x, y + h, x, y, r)
        c.arcTo(x, y, x + w, y, r)
        c.closePath()
        c.fill()
      }
      c.fillStyle = '#f00'
      rr(48, 8, 64, 46, 16)
      rr(8, 46, 68, 58, 16)
      c.fillStyle = '#0f0'
      rr(48, 106, 64, 46, 16)
      rr(84, 56, 68, 58, 16)
      c.fillStyle = '#000'
      c.beginPath()
      c.arc(66, 24, 6, 0, 6.283)
      c.arc(94, 136, 6, 0, 6.283)
      c.fill()
      const d = c.getImageData(0, 0, 160, 160).data
      let guard = 0
      while (out.length < 900 && guard++ < 60000) {
        const x = Math.floor(rnd(0, 160))
        const y = Math.floor(rnd(0, 160))
        const i = (y * 160 + x) * 4
        const blue = d[i] > 128
        const yellow = d[i + 1] > 128
        if (blue || yellow) out.push([(x - 80) / 80, -(y - 80) / 80, rnd(-0.12, 0.12), yellow ? 1 : 0])
      }
    }
  } else if (kind === 'git') {
    const main: P[] = Array.from({ length: 6 }, (_, i) => [-0.9 + i * 0.36, 0.45, 0] as P)
    const b1: P[] = [[-0.36, 0.45, 0], [-0.1, 0, 0.25], [0.26, -0.15, 0.3], [0.62, 0.45, 0]]
    const b2: P[] = [[0.0, 0.45, 0], [0.2, 0.85, -0.2], [0.55, 0.9, -0.2]]
    const nodes = [...main, b1[1], b1[2], b2[1], b2[2]]
    for (let i = 0; i < main.length - 1; i++) line(main[i], main[i + 1], 14, out)
    for (let i = 0; i < b1.length - 1; i++) line(b1[i], b1[i + 1], 16, out)
    for (let i = 0; i < b2.length - 1; i++) line(b2[i], b2[i + 1], 14, out)
    nodes.forEach((p) => ball(p, 0.1, 26, out))
  } else if (kind === 'pizza') {
    // A whole pie with one slice pulled out: puffed crust, bubbly cheese, pepperoni (in the accent colour), basil,
    // and strings of cheese still joining the slice to the rest.
    const R = 0.8
    const gap = 0.9 // the slice spans 0..gap radians
    const pull: P = [Math.cos(gap / 2) * 0.3, 0.1, Math.sin(gap / 2) * 0.3]
    const inSlice = (th: number) => ((th % 6.283) + 6.283) % 6.283 < gap
    const at = (x: number, y: number, z: number, th: number, tone = 0): P =>
      inSlice(th) ? [x + pull[0], y + pull[1], z + pull[2], tone] : [x, y, z, tone]
    const cheese = (x: number, z: number) => 0.05 + 0.025 * Math.sin(x * 13) * Math.sin(z * 11) + 0.015 * Math.sin(x * 29 + z * 23)
    for (let i = 0; i < 1100; i++) {
      const th = rnd(0, 6.283)
      const r = Math.sqrt(Math.random()) * R
      const x = Math.cos(th) * r
      const z = Math.sin(th) * r
      out.push(at(x, cheese(x, z), z, th))
    }
    // Crust: a puffy torus, lumpy along its length.
    for (let i = 0; i < 700; i++) {
      const th = rnd(0, 6.283)
      const ph = rnd(0, 6.283)
      const m = 0.085 + 0.025 * Math.sin(th * 9) * Math.sin(th * 4 + 1)
      const rr = R + 0.07 + Math.cos(ph) * m
      out.push(at(Math.cos(th) * rr, 0.06 + Math.sin(ph) * m * 0.8, Math.sin(th) * rr, th))
    }
    // The base, a little below, so the pie has thickness.
    for (let i = 0; i < 260; i++) {
      const th = rnd(0, 6.283)
      const r = Math.sqrt(Math.random()) * (R + 0.08)
      out.push(at(Math.cos(th) * r, -0.04, Math.sin(th) * r, th))
    }
    // Cut edges of the slice and of the gap it left.
    for (const edge of [0, gap]) for (let i = 0; i < 40; i++) {
      const r = (i / 39) * (R + 0.1)
      const y = rnd(-0.04, 0.06)
      const x = Math.cos(edge) * r
      const z = Math.sin(edge) * r
      out.push([x, y, z, 0], [x + pull[0], y + pull[1], z + pull[2], 0])
    }
    // Pepperoni: raised, dense discs.
    const pep: [number, number][] = [[0.45, 0.2], [1.6, 0.5], [2.3, 0.25], [2.9, 0.58], [3.6, 0.3], [4.3, 0.6], [4.9, 0.22], [5.6, 0.5], [0.95, 0.62], [0.5, 0.58], [1.2, 0.22], [6.0, 0.08]]
    for (const [th0, r0] of pep) {
      const cx = Math.cos(th0) * r0
      const cz = Math.sin(th0) * r0
      for (let i = 0; i < 46; i++) {
        const a = rnd(0, 6.283)
        const r = Math.sqrt(Math.random()) * 0.11
        const x = cx + Math.cos(a) * r
        const z = cz + Math.sin(a) * r
        out.push(at(x, 0.09 + (0.11 - r) * 0.25, z, th0, 1))
      }
    }
    // Basil: a few small leaves.
    for (const [th0, r0] of [[1.9, 0.35], [3.2, 0.12], [4.6, 0.4], [5.3, 0.15]] as [number, number][]) {
      for (let i = 0; i < 16; i++) {
        const t = i / 15 - 0.5
        const x = Math.cos(th0) * r0 + t * 0.14
        const z = Math.sin(th0) * r0 + Math.sin((t + 0.5) * 3.14) * 0.04 * (i % 2 ? 1 : -1)
        out.push(at(x, 0.1, z, th0))
      }
    }
    // Cheese strings: sagging threads from the pie to the slice.
    for (let k = 0; k < 5; k++) {
      const r0 = 0.25 + k * 0.12
      const th = gap / 2 + (k - 2) * 0.12
      const a: P = [Math.cos(th) * r0 * 0.6, 0.05, Math.sin(th) * r0 * 0.6]
      for (let i = 0; i < 14; i++) {
        const t = i / 13
        out.push([a[0] + pull[0] * t, a[1] + pull[1] * t - Math.sin(t * Math.PI) * 0.06, a[2] + pull[2] * t, 0])
      }
    }
  } else if (kind === 'bowl') {
    // A ramen bowl: deep body on a foot, broth surface, a soft egg, nori, noodles lifted on chopsticks, steam.
    const rim = 0.85
    for (let i = 0; i < 620; i++) {
      const th = rnd(0, 6.283)
      const ph = rnd(0.15, 1.5) // from the bottom to the rim
      const r = Math.sin(ph) * rim
      out.push([Math.cos(th) * r, 0.3 - Math.cos(ph) * 0.62, Math.sin(th) * r])
    }
    for (let i = 0; i < 120; i++) {
      const th = (i / 120) * 6.283
      out.push([Math.cos(th) * rim * 1.03, 0.31, Math.sin(th) * rim * 1.03])
    }
    for (let i = 0; i < 60; i++) {
      const th = (i / 60) * 6.283
      out.push([Math.cos(th) * 0.32, -0.36, Math.sin(th) * 0.32], [Math.cos(th) * 0.32, -0.3, Math.sin(th) * 0.32])
    }
    // Broth, a little below the rim, with a band pattern on the outside.
    for (let i = 0; i < 260; i++) {
      const th = rnd(0, 6.283)
      const r = Math.sqrt(Math.random()) * rim * 0.93
      out.push([Math.cos(th) * r, 0.2, Math.sin(th) * r])
    }
    for (let i = 0; i < 80; i++) {
      const th = (i / 80) * 6.283
      out.push([Math.cos(th) * 0.8, 0.02 + Math.sin(th * 8) * 0.04, Math.sin(th) * 0.8, 1])
    }
    // Half an egg: white dome with the accent yolk.
    for (let i = 0; i < 90; i++) {
      const a = rnd(0, 6.283)
      const r = Math.sqrt(Math.random())
      const yolk = r < 0.55
      out.push([0.35 + Math.cos(a) * r * 0.2, 0.24 + (1 - r * r) * 0.05, 0.2 + Math.sin(a) * r * 0.16, yolk ? 1 : 0])
    }
    // Nori sheet standing at the back.
    for (let i = 0; i < 80; i++) out.push([-0.45 + rnd(-0.16, 0.16), 0.22 + rnd(0, 0.42), -0.45 + rnd(-0.02, 0.02)])
    // Chopsticks, with noodles hanging from them.
    line([-0.9, 1.05, 0.1], [0.25, 0.55, 0.05], 34, out)
    line([-0.88, 1.12, 0.22], [0.27, 0.6, 0.12], 34, out)
    for (let k = 0; k < 5; k++) for (let i = 0; i < 24; i++) {
      const t = i / 23
      const x0 = 0.1 + k * 0.035
      out.push([x0 + Math.sin(t * 9 + k) * 0.03, 0.6 - t * 0.4, 0.08 + Math.cos(t * 7 + k) * 0.03, k % 2])
    }
    // Steam.
    for (let k = 0; k < 3; k++) for (let i = 0; i < 22; i++) {
      const t = i / 21
      out.push([-0.15 + k * 0.22 + Math.sin(t * 6 + k) * 0.08, 0.4 + t * 0.6, -0.2 + Math.sin(t * 5 + k * 2) * 0.08])
    }
  } else if (kind === 'guitar') {
    // An acoustic guitar laid on a diagonal: a waisted body with depth, sound hole in the accent colour, bridge,
    // a fretted neck, headstock with pegs, and six strings.
    const ax = Math.cos(0.6)
    const ay = Math.sin(0.6)
    const place = (u: number, v: number, z: number, tone = 0): P => [u * ax - v * ay - 0.2, u * ay + v * ax - 0.25, z, tone]
    // Body outline as width along its length u in -0.75..0.35: two bouts and a waist.
    const half = (u: number) => {
      const t = (u + 0.75) / 1.1
      return Math.sqrt(Math.max(0, Math.sin(t * Math.PI))) * (0.5 - 0.13 * Math.exp(-Math.pow((t - 0.55) / 0.12, 2)) - 0.1 * t)
    }
    for (let i = 0; i < 900; i++) {
      const u = rnd(-0.75, 0.35)
      const w = half(u)
      const face = Math.random()
      if (face < 0.4) {
        // top, with the sound hole cut out
        const v = rnd(-w, w)
        if (Math.hypot(u - 0.05, v) < 0.13) continue
        out.push(place(u, v, 0.1))
      } else if (face < 0.7) out.push(place(u, rnd(-w, w), -0.1))
      else out.push(place(u, Math.random() < 0.5 ? -w : w, rnd(-0.1, 0.1)))
    }
    for (let i = 0; i < 50; i++) {
      const a = (i / 50) * 6.283
      out.push(place(0.05 + Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0.1, 1))
    }
    box(place(-0.48, 0, 0.12) as P, 0.06, 0.32, 0.03, 30, out)
    // Neck and frets.
    for (let i = 0; i < 160; i++) out.push(place(rnd(0.3, 1.25), rnd(-0.055, 0.055), rnd(0.06, 0.11)))
    for (let k = 0; k < 12; k++) {
      const u = 0.36 + Math.pow(k / 12, 0.8) * 0.86
      for (let i = 0; i < 6; i++) out.push(place(u, -0.055 + (i / 5) * 0.11, 0.115, 1))
    }
    // Headstock and pegs.
    for (let i = 0; i < 70; i++) out.push(place(rnd(1.25, 1.5), rnd(-0.08, 0.08), rnd(0.06, 0.1)))
    for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) ball(place(1.3 + k * 0.08, sd * 0.12, 0.08) as P, 0.025, 6, out)
    // Strings.
    for (let k = 0; k < 6; k++) {
      const v = -0.045 + k * 0.018
      for (let i = 0; i < 70; i++) out.push(place(-0.48 + (i / 69) * 1.75, v, 0.13))
    }
  } else if (kind === 'brain') {
    // Two lobes of dots, wired across the middle.
    for (let i = 0; i < 360; i++) {
      const u = rnd(-1, 1)
      const a = rnd(0, 6.283)
      const s = Math.sqrt(1 - u * u)
      const side = i % 2 ? 1 : -1
      const wob = 1 + 0.12 * Math.sin(a * 5 + u * 6)
      out.push([side * 0.38 + 0.5 * s * Math.cos(a) * wob * 0.9, 0.55 * u * wob, 0.65 * s * Math.sin(a) * wob])
    }
    for (let i = 0; i < 14; i++) line([-0.3, rnd(-0.4, 0.4), rnd(-0.4, 0.4)], [0.3, rnd(-0.4, 0.4), rnd(-0.4, 0.4)], 10, out)
  } else if (kind === 'cpp') {
    const cv = document.createElement('canvas')
    cv.width = 200
    cv.height = 90
    const c = cv.getContext('2d')
    if (c) {
      c.fillStyle = '#fff'
      c.font = '900 84px system-ui, sans-serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('C++', 100, 50)
      const d = c.getImageData(0, 0, 200, 90).data
      let guard = 0
      while (out.length < 640 && guard++ < 40000) {
        const x = Math.floor(rnd(0, 200))
        const y = Math.floor(rnd(0, 90))
        if (d[(y * 200 + x) * 4 + 3] > 128) out.push([(x - 100) / 100, -(y - 45) / 100, rnd(-0.12, 0.12)])
      }
    }
  } else {
    // data: a stack of database discs, with a few bars beside it.
    for (let k = 0; k < 4; k++) {
      const y = 0.65 - k * 0.45
      for (let i = 0; i < 70; i++) {
        const th = (i / 70) * 6.283
        out.push([Math.cos(th) * 0.6 - 0.35, y, Math.sin(th) * 0.6])
      }
      if (k < 3) for (let i = 0; i < 6; i++) {
        const th = (i / 6) * 6.283
        line([Math.cos(th) * 0.6 - 0.35, y, Math.sin(th) * 0.6], [Math.cos(th) * 0.6 - 0.35, y - 0.45, Math.sin(th) * 0.6], 9, out)
      }
    }
    ;[0.4, 0.75, 1.1].forEach((h, i) => box([0.55 + i * 0.28, -0.8 + h / 2, 0], 0.18, h, 0.18, 70, out))
  }
  return out
}

export default function CertObject({ kind, size = 160 }: { kind: ObjKind; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = size * dpr
    cv.height = size * dpr
    const pts = build(kind)
    // Flat objects lean towards you so you see their face, not their edge.
    const tilt = kind === 'pizza' ? 0.85 : kind === 'bowl' ? 0.42 : 0.22
    let rot = rnd(0, 6)
    let spin = 0.5
    let hover = false
    let visible = false
    let raf = 0
    let last = performance.now()
    let frame = 0
    let col = '#fff'
    let hot = '#f60'
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(cv)
    const over = () => (hover = true)
    const out = () => (hover = false)
    cv.addEventListener('pointerenter', over)
    cv.addEventListener('pointerleave', out)
    // The whole row is the hover target, not just the canvas.
    const row = cv.closest('button')
    row?.addEventListener('pointerenter', over)
    row?.addEventListener('pointerleave', out)

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (visible) {
        spin += ((hover ? 2.4 : 0.5) - spin) * Math.min(1, dt * 4)
        if (!reduced) rot += dt * spin
        if (frame++ % 30 === 0) {
          const cs = getComputedStyle(cv)
          col = cs.color
          hot = cs.getPropertyValue('--brand2').trim() || cs.getPropertyValue('--hot').trim() || col
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, size, size)
        // Thin objects rock side to side instead of turning edge-on.
        const ang = kind === 'guitar' ? Math.sin(rot * 0.8) * 0.7 : rot
        const cr = Math.cos(ang)
        const sr = Math.sin(ang)
        const ct = Math.cos(tilt)
        const st = Math.sin(tilt)
        const scale = size * 0.3
        for (const [x, y, z, tone] of pts) {
          const x1 = x * cr + z * sr
          const z1 = -x * sr + z * cr
          const y2 = y * ct - z1 * st
          const z2 = y * st + z1 * ct
          const f = 3.2 / (3.2 + z2)
          const r = 0.9 + f * 0.9
          ctx.globalAlpha = Math.max(0.25, Math.min(1, 0.55 + z2 * 0.5))
          ctx.fillStyle = tone ? hot : col
          ctx.fillRect(size / 2 + x1 * scale * f - r / 2, size / 2 - y2 * scale * f - r / 2, r, r)
        }
        ctx.globalAlpha = 1
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      cv.removeEventListener('pointerenter', over)
      cv.removeEventListener('pointerleave', out)
      row?.removeEventListener('pointerenter', over)
      row?.removeEventListener('pointerleave', out)
    }
  }, [kind, size])

  return <canvas ref={ref} aria-hidden className="shrink-0" style={{ width: size, height: size, color: 'var(--brand, var(--hot))' }} />
}
