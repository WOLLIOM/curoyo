'use client'

import { useEffect, useRef, useState } from 'react'
import { Stage, Screen } from './Playground'

// Client-facing pieces: configurators, live data, commerce, maps, assistants. Each one behaves like the real thing.
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))

/* ───────────── 3D product configurator ─────────────
   Three products made of lit points that morph into each other. Drag to turn, pick a finish and a surface. */
type Pt = [number, number, number, number, number, number] // position + normal
const N3 = 2600

function sampleBox(out: Pt[], n: number, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) {
  const a = [sy * sz, sy * sz, sx * sz, sx * sz, sx * sy, sx * sy]
  const tot = a.reduce((s, v) => s + v, 0)
  for (let i = 0; i < n; i++) {
    let r = Math.random() * tot
    let f = 0
    while (r > a[f]) r -= a[f++]
    const u = rand(-0.5, 0.5)
    const v = rand(-0.5, 0.5)
    const s = f % 2 ? 0.5 : -0.5
    const ax = f >> 1
    const p: Pt = ax === 0 ? [cx + s * sx, cy + u * sy, cz + v * sz, s * 2, 0, 0] : ax === 1 ? [cx + u * sx, cy + s * sy, cz + v * sz, 0, s * 2, 0] : [cx + u * sx, cy + v * sy, cz + s * sz, 0, 0, s * 2]
    out.push(p)
  }
}
// Cylinder along y (or x when sideways) with caps.
function sampleCyl(out: Pt[], n: number, cx: number, cy: number, cz: number, r: number, len: number, sideways = false) {
  const side = 2 * Math.PI * r * len
  const cap = Math.PI * r * r
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.283)
    let p: Pt
    if (Math.random() < side / (side + 2 * cap)) {
      const t = rand(-0.5, 0.5) * len
      p = [Math.cos(a) * r, t, Math.sin(a) * r, Math.cos(a), 0, Math.sin(a)]
    } else {
      const s = Math.random() < 0.5 ? -1 : 1
      const rr = r * Math.sqrt(Math.random())
      p = [Math.cos(a) * rr, (s * len) / 2, Math.sin(a) * rr, 0, s, 0]
    }
    if (sideways) p = [p[1], p[0], p[2], p[4], p[3], p[5]]
    out.push([p[0] + cx, p[1] + cy, p[2] + cz, p[3], p[4], p[5]])
  }
}
function fit(src: Pt[]): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < N3; i++) out.push(src[(Math.random() * src.length) | 0])
  return out
}
function bottle(): Pt[] {
  const out: Pt[] = []
  const prof = (v: number) => (v < 0.04 ? 0.5 + v * 2 : v < 0.58 ? 0.58 : v < 0.72 ? 0.58 - ((v - 0.58) / 0.14) * 0.36 : v < 0.9 ? 0.22 : 0.25)
  for (let i = 0; i < 2600; i++) {
    const v = Math.random()
    const a = rand(0, 6.283)
    const r = prof(v)
    const sl = (prof(Math.min(1, v + 0.01)) - prof(Math.max(0, v - 0.01))) / 0.02 / 2.2
    const y = -1.05 + v * 2.2
    const l = Math.hypot(1, sl)
    out.push([Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(a) / l, -sl / l, Math.sin(a) / l])
  }
  // cap ring and label band for detail
  sampleCyl(out, 260, 0, 1.08, 0, 0.27, 0.16)
  for (let i = 0; i < 300; i++) {
    const a = rand(0, 6.283)
    out.push([Math.cos(a) * 0.6, rand(-0.35, 0.1), Math.sin(a) * 0.6, Math.cos(a), 0, Math.sin(a)])
  }
  return fit(out)
}
function headphones(): Pt[] {
  const out: Pt[] = []
  // headband: a flat arc
  for (let i = 0; i < 900; i++) {
    const f = rand(0.08, Math.PI - 0.08)
    const R = Math.random() < 0.5 ? 0.86 : 0.78
    const out1 = R > 0.8 ? 1 : -1
    out.push([Math.cos(f) * R, -0.05 + Math.sin(f) * R * 1.05, rand(-0.13, 0.13), Math.cos(f) * out1, Math.sin(f) * out1, 0])
  }
  for (const s of [-1, 1]) {
    sampleCyl(out, 700, s * 0.84, -0.45, 0, 0.4, 0.2, true) // cup
    // cushion: a torus on the inner face
    for (let i = 0; i < 420; i++) {
      const a = rand(0, 6.283)
      const b = rand(0, 6.283)
      const R = 0.3
      const r = 0.09
      const ny = Math.cos(a) * Math.cos(b)
      const nz = Math.sin(a) * Math.cos(b)
      out.push([s * 0.84 - s * (0.12 + r * (1 + Math.sin(b))), -0.45 + Math.cos(a) * (R + r * Math.cos(b)), Math.sin(a) * (R + r * Math.cos(b)), -s * Math.sin(b), ny, nz])
    }
    sampleBox(out, 160, s * 0.84, -0.04, 0, 0.08, 0.3, 0.16) // yoke
  }
  return fit(out)
}
function chair(): Pt[] {
  const out: Pt[] = []
  sampleBox(out, 1100, 0, -0.12, 0.05, 1.25, 0.16, 1.15) // seat
  sampleBox(out, 900, 0, 0.55, -0.48, 1.25, 1.1, 0.12) // back
  sampleBox(out, 220, 0, 0.98, -0.48, 1.32, 0.08, 0.18) // top rail
  for (const x of [-0.52, 0.52]) for (const z of [-0.42, 0.52]) sampleCyl(out, 200, x, -0.62, z, 0.055, 0.86)
  sampleCyl(out, 120, 0, -0.75, 0.05, 0.03, 1.04, true) // stretcher
  return fit(out)
}
const PRODUCTS = [
  { name: 'Bottle', base: 38, make: bottle },
  { name: 'Headset', base: 249, make: headphones },
  { name: 'Chair', base: 420, make: chair },
]
const FINISHES = [
  { name: 'Ember', c: '#e8541f', add: 0 },
  { name: 'Sand', c: '#c9a977', add: 0 },
  { name: 'Sage', c: '#4f9a6a', add: 10 },
  { name: 'Ink', c: '#2f3fc4', add: 10 },
  { name: 'Bone', c: '#e9e2d4', add: 18 },
]

export function ConfiguratorDemo() {
  const [prod, setProd] = useState(0)
  const [f, setF] = useState(0)
  const [gloss, setGloss] = useState(false)
  const st = useRef({ prod, f, gloss })
  st.current = { prod, f, gloss }
  const price = PRODUCTS[prod].base + FINISHES[f].add + (gloss ? 12 : 0)
  return (
    <Screen bg="#efe7da" fg="#1a1410">
      <Stage
        noScroll
        make={({ w, h, ptr }) => {
          const shapes = PRODUCTS.map((p) => p.make())
          const cur = shapes[st.current.prod].map((p) => [...p])
          const order = Array.from({ length: N3 }, (_, i) => i)
          const zs = new Float32Array(N3)
          const sx = new Float32Array(N3)
          const sy = new Float32Array(N3)
          const lit = new Float32Array(N3)
          let yaw = 0.6
          let pitch = 0.28
          let vel = 0.5
          let lastX = 0
          let lastY = 0
          let col = hex(FINISHES[0].c)
          let gl = 0
          return {
            press() {
              lastX = ptr.x
              lastY = ptr.y
            },
            draw(ctx, dt) {
              const s = st.current
              const tgtShape = shapes[s.prod]
              const k = Math.min(1, dt * 5)
              for (let i = 0; i < N3; i++) {
                const c = cur[i]
                const t = tgtShape[i]
                // stagger the morph a little by index so it pours rather than snaps
                const kk = k * (0.6 + (i % 7) * 0.08)
                for (let j = 0; j < 6; j++) c[j] += (t[j] - c[j]) * kk
              }
              const tgt = hex(FINISHES[s.f].c)
              col = col.map((v, i) => v + (tgt[i] - v) * Math.min(1, dt * 6))
              gl += ((s.gloss ? 1 : 0) - gl) * Math.min(1, dt * 6)
              if (ptr.down && ptr.inside) {
                vel = (ptr.x - lastX) * 0.012 / Math.max(dt, 0.008)
                pitch = Math.max(-0.2, Math.min(0.8, pitch + (ptr.y - lastY) * 0.006))
              } else vel += (0.5 - vel) * dt * 1.2
              lastX = ptr.x
              lastY = ptr.y
              yaw += vel * dt
              ctx.fillStyle = '#efe7da'
              ctx.fillRect(0, 0, w, h)
              const cx = w / 2
              const cy = h * 0.47
              const S = Math.min(w, h) * 0.3
              // soft contact shadow: a radial gradient squashed into an ellipse
              ctx.save()
              ctx.translate(cx, cy + S * 1.12)
              ctx.scale(1, 0.18)
              const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 1.1)
              gr.addColorStop(0, 'rgba(26,20,16,0.28)')
              gr.addColorStop(1, 'rgba(26,20,16,0)')
              ctx.fillStyle = gr
              ctx.beginPath()
              ctx.arc(0, 0, S * 1.1, 0, 6.283)
              ctx.fill()
              ctx.restore()
              const cyw = Math.cos(yaw)
              const syw = Math.sin(yaw)
              const cp = Math.cos(pitch)
              const sp = Math.sin(pitch)
              // light from upper left front, viewer at +z
              const L = [-0.45, 0.65, 0.62]
              const H = [L[0], L[1], L[2] + 1]
              const hl = Math.hypot(H[0], H[1], H[2])
              for (let i = 0; i < N3; i++) {
                const c = cur[i]
                const x1 = c[0] * cyw + c[2] * syw
                const z1 = -c[0] * syw + c[2] * cyw
                const y2 = c[1] * cp - z1 * sp
                const z2 = c[1] * sp + z1 * cp
                const nx = c[3] * cyw + c[5] * syw
                const nz1 = -c[3] * syw + c[5] * cyw
                const ny = c[4] * cp - nz1 * sp
                const nz = c[4] * sp + nz1 * cp
                const nl = Math.hypot(nx, ny, nz) || 1
                const d = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / nl)
                const sp2 = Math.max(0, (nx * H[0] + ny * H[1] + nz * H[2]) / nl / hl)
                const per = 3.2 / (3.2 - z2)
                sx[i] = cx + x1 * S * per
                sy[i] = cy - y2 * S * per
                zs[i] = z2
                lit[i] = 0.28 + d * 0.72 + (nz / nl < 0 ? -0.15 : 0) + gl * Math.pow(sp2, 30) * 2.2 + (1 - gl) * Math.pow(sp2, 6) * 0.25
              }
              order.sort((a, b) => zs[a] - zs[b])
              for (const i of order) {
                const l = lit[i]
                const r = Math.min(255, col[0] * l + Math.max(0, l - 1) * 120) | 0
                const g = Math.min(255, col[1] * l + Math.max(0, l - 1) * 120) | 0
                const b = Math.min(255, col[2] * l + Math.max(0, l - 1) * 120) | 0
                ctx.fillStyle = `rgb(${r},${g},${b})`
                const z = 2 + zs[i] * 0.5
                ctx.fillRect(sx[i] - z / 2, sy[i] - z / 2, z, z)
              }
            },
          }
        }}
      />
      <div className="absolute inset-x-3 top-3 flex items-start justify-between">
        <div className="flex gap-1 rounded-full bg-black/[0.07] p-1">
          {PRODUCTS.map((p, i) => (
            <button key={p.name} onClick={() => setProd(i)} aria-pressed={prod === i} className="rounded-full px-2.5 py-1 text-[11.5px] font-extrabold transition-colors" style={{ background: prod === i ? '#1a1410' : 'transparent', color: prod === i ? '#efe7da' : '#1a1410' }}>
              {p.name}
            </button>
          ))}
        </div>
        <p className="pt-1 text-right text-[20px] font-extrabold tabular-nums leading-none">€{price}</p>
      </div>
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {FINISHES.map((x, i) => (
            <button key={x.name} onClick={() => setF(i)} aria-label={x.name} aria-pressed={f === i} className="h-5 w-5 rounded-full transition-transform" style={{ background: x.c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)', outline: f === i ? '2px solid #1a1410' : '2px solid transparent', outlineOffset: 2, transform: f === i ? 'scale(1.12)' : 'none' }} />
          ))}
        </div>
        <button onClick={() => setGloss((g) => !g)} aria-pressed={gloss} className="rounded-full px-2.5 py-1 text-[11px] font-extrabold" style={{ boxShadow: 'inset 0 0 0 1.5px #1a1410', background: gloss ? '#1a1410' : 'transparent', color: gloss ? '#efe7da' : '#1a1410' }}>
          {gloss ? 'Gloss' : 'Matte'}
        </button>
      </div>
      <p className="pointer-events-none absolute inset-x-0 bottom-11 text-center text-[11px] font-bold opacity-50">{FINISHES[f].name} · drag to turn</p>
    </Screen>
  )
}

/* ───────────── Live dashboard ─────────────
   Three metrics, this week against last, a channel split and a feed of what just happened. */
const METRICS = [
  { name: 'Visitors', c: '#1f7aff', unit: '', mul: 214, base: 50 },
  { name: 'Revenue', c: '#0e9f5f', unit: '€', mul: 38, base: 60 },
  { name: 'Orders', c: '#e8541f', unit: '', mul: 3.1, base: 40 },
]
const CHANNELS = [
  { n: 'Search', c: '#1f7aff' },
  { n: 'Social', c: '#8b7bff' },
  { n: 'Direct', c: '#0b2540' },
  { n: 'Email', c: '#2fd0a0' },
]
const FEED = ['Order · Berlin', 'Signup · Lisbon', 'Order · Tokyo', 'Refund · Austin', 'Order · Seoul', 'Signup · Oslo', 'Order · Milan', '★★★★★ · Paris']
export function DashboardDemo() {
  const [m, setM] = useState(0)
  const mRef = useRef(m)
  mRef.current = m
  return (
    <Screen bg="#eaf2fb" fg="#0b2540">
      <Stage
        make={({ w, h, ptr }) => {
          const n = 48
          const series = METRICS.map((M) => {
            const now: number[] = []
            const prev: number[] = []
            let v = M.base
            let p = M.base * 0.92
            for (let i = 0; i < n; i++) {
              const day = Math.sin((i / n) * Math.PI * 2 - 1.6) * 8
              now.push((v += rand(-3, 3.6)) + day)
              prev.push((p += rand(-3, 3.1)) + day)
            }
            return { now, prev }
          })
          let shares = [0.42, 0.24, 0.2, 0.14]
          let disp = [...shares]
          let acc = 0
          let feed: { t: string; age: number }[] = [{ t: FEED[0], age: 2 }, { t: FEED[1], age: 1 }]
          let fAcc = 0
          let shown = 0
          let mk = 0
          let col = hex(METRICS[0].c)
          return {
            draw(ctx, dt) {
              const mi = mRef.current
              const M = METRICS[mi]
              acc += dt
              if (acc > 0.7) {
                acc = 0
                series.forEach((s, j) => {
                  s.now.push(s.now[s.now.length - 1] + rand(-3, 3.8))
                  s.now.shift()
                  s.prev.push(s.prev[s.prev.length - 1] + rand(-3, 3.2))
                  s.prev.shift()
                  if (j === 0) {
                    shares = shares.map((x) => Math.max(0.06, x + rand(-0.02, 0.02)))
                    const t = shares.reduce((a, b) => a + b, 0)
                    shares = shares.map((x) => x / t)
                  }
                })
              }
              fAcc += dt
              if (fAcc > 1.6) {
                fAcc = 0
                feed.unshift({ t: FEED[(Math.random() * FEED.length) | 0], age: 0 })
                feed = feed.slice(0, 3)
              }
              feed.forEach((x) => (x.age += dt))
              if (shown !== mi) {
                shown = mi
                mk = 0
              }
              mk = Math.min(1, mk + dt * 2.2)
              const tg = hex(M.c)
              col = col.map((v, i) => v + (tg[i] - v) * Math.min(1, dt * 8))
              const C = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`
              const Ca = (a: number) => `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${a})`
              disp = disp.map((v, i) => v + (shares[i] - v) * Math.min(1, dt * 3))

              ctx.fillStyle = '#eaf2fb'
              ctx.fillRect(0, 0, w, h)
              const pad = 16
              const { now, prev } = series[mi]
              const all = [...now, ...prev]
              const lo = Math.min(...all) - 2
              const hi = Math.max(...all) + 2
              const cy = 92
              const ch = h * 0.36
              const X = (i: number) => pad + (i / (n - 1)) * (w - pad * 2)
              const Y = (d: number) => cy + ch - ((d - lo) / (hi - lo)) * ch
              const ease = 1 - Math.pow(1 - mk, 3)
              const upto = Math.max(2, Math.round(ease * n))
              const idx = ptr.inside && ptr.y > cy - 20 && ptr.y < cy + ch + 12 ? Math.max(0, Math.min(upto - 1, Math.round(((ptr.x - pad) / (w - pad * 2)) * (n - 1)))) : -1
              const at = idx < 0 ? n - 1 : idx
              const fmt = (x: number) => M.unit + Math.round(x * M.mul).toLocaleString('en-US')
              // KPI
              ctx.textAlign = 'left'
              ctx.fillStyle = '#0b2540'
              ctx.font = '800 28px system-ui, sans-serif'
              ctx.fillText(fmt(now[at]), pad, 78)
              const tot = now.reduce((a, b) => a + b, 0)
              const ptot = prev.reduce((a, b) => a + b, 0)
              const delta = ((tot - ptot) / ptot) * 100
              ctx.font = '800 12px system-ui, sans-serif'
              ctx.textAlign = 'right'
              ctx.fillStyle = delta >= 0 ? '#0e9f5f' : '#d9412f'
              ctx.fillText(`${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}% vs last wk`, w - pad, 76)
              // grid
              ctx.strokeStyle = 'rgba(11,37,64,0.08)'
              ctx.lineWidth = 1
              for (let g = 0; g < 4; g++) {
                ctx.beginPath()
                ctx.moveTo(pad, cy + (ch / 3) * g)
                ctx.lineTo(w - pad, cy + (ch / 3) * g)
                ctx.stroke()
              }
              // last week, dashed
              ctx.setLineDash([3, 4])
              ctx.strokeStyle = 'rgba(11,37,64,0.35)'
              ctx.lineWidth = 1.4
              ctx.beginPath()
              for (let i = 0; i < upto; i++) (i ? ctx.lineTo(X(i), Y(prev[i])) : ctx.moveTo(X(i), Y(prev[i])))
              ctx.stroke()
              ctx.setLineDash([])
              // this week, area + line
              const area = ctx.createLinearGradient(0, cy, 0, cy + ch)
              area.addColorStop(0, Ca(0.32))
              area.addColorStop(1, Ca(0))
              ctx.beginPath()
              ctx.moveTo(X(0), cy + ch)
              for (let i = 0; i < upto; i++) ctx.lineTo(X(i), Y(now[i]))
              ctx.lineTo(X(upto - 1), cy + ch)
              ctx.fillStyle = area
              ctx.fill()
              ctx.beginPath()
              for (let i = 0; i < upto; i++) (i ? ctx.lineTo(X(i), Y(now[i])) : ctx.moveTo(X(i), Y(now[i])))
              ctx.strokeStyle = C
              ctx.lineWidth = 2.2
              ctx.lineJoin = 'round'
              ctx.stroke()
              // live dot
              const pulse = (performance.now() / 900) % 1
              ctx.fillStyle = Ca(0.35 * (1 - pulse))
              ctx.beginPath()
              ctx.arc(X(upto - 1), Y(now[upto - 1]), 4 + pulse * 9, 0, 6.283)
              ctx.fill()
              ctx.fillStyle = C
              ctx.beginPath()
              ctx.arc(X(upto - 1), Y(now[upto - 1]), 3.5, 0, 6.283)
              ctx.fill()
              // hover tooltip
              if (idx >= 0) {
                ctx.strokeStyle = 'rgba(11,37,64,0.3)'
                ctx.beginPath()
                ctx.moveTo(X(idx), cy - 4)
                ctx.lineTo(X(idx), cy + ch)
                ctx.stroke()
                ctx.fillStyle = '#0b2540'
                ctx.beginPath()
                ctx.arc(X(idx), Y(now[idx]), 4, 0, 6.283)
                ctx.fill()
                const hr = Math.floor((idx / n) * 24)
                const tw = 96
                const tx = Math.max(pad, Math.min(w - pad - tw, X(idx) - tw / 2))
                const ty = Math.max(cy - 2, Y(now[idx]) - 52)
                ctx.fillStyle = '#0b2540'
                ctx.beginPath()
                ctx.roundRect(tx, ty, tw, 40, 8)
                ctx.fill()
                ctx.textAlign = 'left'
                ctx.fillStyle = 'rgba(255,255,255,0.6)'
                ctx.font = '700 10px system-ui, sans-serif'
                ctx.fillText(`${String(hr).padStart(2, '0')}:00 · last wk ${fmt(prev[idx])}`, tx + 8, ty + 15)
                ctx.fillStyle = '#fff'
                ctx.font = '800 14px system-ui, sans-serif'
                ctx.fillText(fmt(now[idx]), tx + 8, ty + 32)
              }
              // channel donut
              const dy = cy + ch + 22
              const R = Math.min(34, (h - dy - 14) / 2)
              const dcx = pad + R
              const dcy = dy + R + 2
              let a0 = -Math.PI / 2
              disp.forEach((v, i) => {
                const a1 = a0 + v * Math.PI * 2 * ease
                ctx.strokeStyle = CHANNELS[i].c
                ctx.lineWidth = 9
                ctx.beginPath()
                ctx.arc(dcx, dcy, R - 5, a0 + 0.03, a1 - 0.03)
                ctx.stroke()
                a0 = a1
              })
              ctx.fillStyle = '#0b2540'
              ctx.textAlign = 'center'
              ctx.font = '800 12px system-ui, sans-serif'
              ctx.fillText(`${Math.round(disp[0] * 100)}%`, dcx, dcy + 4)
              // legend + feed
              ctx.textAlign = 'left'
              const lx = dcx + R + 14
              ctx.font = '700 10.5px system-ui, sans-serif'
              CHANNELS.forEach((c, i) => {
                const yy = dy + 8 + i * 15
                ctx.fillStyle = c.c
                ctx.fillRect(lx, yy - 7, 7, 7)
                ctx.fillStyle = 'rgba(11,37,64,0.7)'
                ctx.fillText(`${c.n} ${Math.round(disp[i] * 100)}%`, lx + 11, yy)
              })
              const fx = lx + 82
              if (fx < w - 60) {
                feed.forEach((e, i) => {
                  const yy = dy + 8 + i * 20
                  const fade = Math.min(1, e.age * 4)
                  ctx.globalAlpha = fade * (1 - i * 0.25)
                  ctx.fillStyle = i === 0 ? C : 'rgba(11,37,64,0.6)'
                  ctx.beginPath()
                  ctx.arc(fx + 3, yy - 3.5, 3, 0, 6.283)
                  ctx.fill()
                  ctx.fillStyle = '#0b2540'
                  ctx.font = `${i === 0 ? 800 : 700} 10.5px system-ui, sans-serif`
                  ctx.fillText(e.t, fx + 11 - (1 - fade) * 8, yy)
                })
                ctx.globalAlpha = 1
              }
            },
          }
        }}
      />
      <div className="absolute inset-x-3 top-3 flex gap-1 rounded-full bg-[#0b2540]/[0.07] p-1">
        {METRICS.map((x, i) => (
          <button key={x.name} onClick={() => setM(i)} aria-pressed={m === i} className="flex-1 rounded-full py-1 text-[11.5px] font-extrabold transition-colors" style={{ background: m === i ? '#0b2540' : 'transparent', color: m === i ? '#fff' : '#0b2540' }}>
            {x.name}
          </button>
        ))}
      </div>
    </Screen>
  )
}

/* ───────────── Ordering flow ─────────────
   Menu, cart, delivery or pickup, free-delivery meter, then a live tracker after checkout. */
const MENU = [
  { n: 'Margherita', d: 'Tomato, fior di latte, basil', p: 12 },
  { n: 'Nduja', d: 'Spicy salami, honey, chilli', p: 15 },
  { n: 'Burrata', d: 'Cream, pesto, cherry tomato', p: 16 },
  { n: 'Tiramisu', d: 'Mascarpone, espresso', p: 8 },
]
const STEPS = ['Received', 'In the oven', 'On the way', 'At your door']
export function OrderDemo() {
  const [q, setQ] = useState<number[]>([1, 0, 0, 0])
  const [mode, setMode] = useState<'Delivery' | 'Pickup'>('Delivery')
  const [phase, setPhase] = useState(-1) // -1 = cart, else progress 0..4
  const [bump, setBump] = useState(0)
  const sub = q.reduce((s, n, i) => s + n * MENU[i].p, 0)
  const free = 30
  const fee = mode === 'Delivery' && sub < free && sub > 0 ? 3.5 : 0
  const total = sub + fee
  const count = q.reduce((a, b) => a + b, 0)
  const set = (i: number, d: number) => {
    setQ((a) => a.map((n, j) => (j === i ? Math.max(0, Math.min(9, n + d)) : n)))
    if (d > 0) setBump((b) => b + 1)
  }
  useEffect(() => {
    if (phase < 0 || phase >= 4) return
    const t = window.setTimeout(() => setPhase((p) => Math.min(4, p + 0.02)), 50)
    return () => window.clearTimeout(t)
  }, [phase])
  if (phase >= 0) {
    const step = Math.min(3, Math.floor(phase))
    const eta = Math.max(0, Math.round((4 - phase) * 6))
    return (
      <Screen bg="#ffc233" fg="#1a1000">
        <div className="flex h-full flex-col p-5">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] opacity-60">Order #{2048 + count}</p>
          <p className="mt-2 text-[34px] font-extrabold leading-none">{phase >= 4 ? 'Enjoy!' : `${eta} min`}</p>
          <p className="mt-1 text-[13px] font-bold opacity-70">{mode === 'Delivery' ? 'Courier · Marco on a bike' : 'Pick up at Via Roma 12'}</p>
          <div className="relative mt-5 h-2 rounded-full bg-black/15">
            <div className="absolute inset-y-0 left-0 rounded-full bg-[#1a1000]" style={{ width: `${(phase / 4) * 100}%` }} />
            <div className="absolute -top-[7px] h-[22px] w-[22px] -translate-x-1/2 rounded-full border-[3px] border-[#ffc233] bg-[#1a1000]" style={{ left: `${(phase / 4) * 100}%` }} />
          </div>
          <ol className="mt-5 flex flex-1 flex-col gap-2.5">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-[15px] font-extrabold transition-opacity" style={{ opacity: i <= step ? 1 : 0.35 }}>
                <span className="grid h-5 w-5 place-items-center rounded-full text-[11px]" style={{ background: i < step || phase >= 4 ? '#1a1000' : 'transparent', color: '#ffc233', boxShadow: 'inset 0 0 0 2px #1a1000' }}>
                  {i < step || phase >= 4 ? '✓' : ''}
                </span>
                {s}
                {i === step && phase < 4 && <span className="ml-auto h-2 w-2 animate-ping rounded-full bg-[#1a1000]" />}
              </li>
            ))}
          </ol>
          <button onClick={() => setPhase(-1)} className="rounded-full py-2.5 text-[14px] font-extrabold" style={{ background: '#1a1000', color: '#ffc233' }}>
            New order
          </button>
        </div>
      </Screen>
    )
  }
  return (
    <Screen bg="#ffc233" fg="#1a1000">
      <div className="flex h-full flex-col px-4 pb-4 pt-3.5">
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5 rounded-full bg-black/10 p-0.5">
            {(['Delivery', 'Pickup'] as const).map((x) => (
              <button key={x} onClick={() => setMode(x)} aria-pressed={mode === x} className="rounded-full px-2.5 py-1 text-[11.5px] font-extrabold" style={{ background: mode === x ? '#1a1000' : 'transparent', color: mode === x ? '#ffc233' : '#1a1000' }}>
                {x}
              </button>
            ))}
          </div>
          <span key={bump} className="grid h-7 min-w-7 place-items-center rounded-full bg-[#1a1000] px-2 text-[12px] font-extrabold text-[#ffc233]" style={{ animation: bump ? 'cartbump .35s ease' : undefined }}>
            {count} in bag
          </span>
        </div>
        <ul className="mt-2 flex flex-1 flex-col justify-between">
          {MENU.map((m, i) => (
            <li key={m.n} className="flex items-center justify-between gap-2 border-b border-black/15 py-1">
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold leading-tight">
                  {m.n} <span className="text-[12px] opacity-60">€{m.p}</span>
                </p>
                <p className="truncate text-[10.5px] font-bold leading-tight opacity-60">{m.d}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => set(i, -1)} aria-label={`Remove ${m.n}`} className="h-6 w-6 rounded-full bg-black/15 text-[14px] font-bold hover:bg-black/25">−</button>
                <span className="w-3 text-center text-[14px] font-bold tabular-nums">{q[i]}</span>
                <button onClick={() => set(i, 1)} aria-label={`Add ${m.n}`} className="h-6 w-6 rounded-full bg-black text-[14px] font-bold text-[#ffc233] hover:opacity-80">+</button>
              </div>
            </li>
          ))}
        </ul>
        {mode === 'Delivery' && (
          <div className="mt-2.5">
            <div className="h-1.5 rounded-full bg-black/15">
              <div className="h-full rounded-full bg-[#1a1000] transition-[width] duration-300" style={{ width: `${Math.min(100, (sub / free) * 100)}%` }} />
            </div>
            <p className="mt-1 text-[11px] font-bold opacity-70">{sub >= free ? 'Free delivery unlocked' : `€${free - sub} more for free delivery`}</p>
          </div>
        )}
        <div className="mt-2.5 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold opacity-60">{fee ? `incl. €${fee.toFixed(2)} delivery` : 'Total'}</p>
            <p className="text-[26px] font-extrabold tabular-nums leading-none">€{total % 1 ? total.toFixed(2) : total}</p>
          </div>
          <button disabled={!sub} onClick={() => setPhase(0)} className="rounded-full px-5 py-2.5 text-[14px] font-extrabold transition-opacity disabled:opacity-30" style={{ background: '#1a1000', color: '#ffc233' }}>
            Checkout
          </button>
        </div>
      </div>
      <style>{`@keyframes cartbump{0%{transform:scale(1)}40%{transform:scale(1.25)}100%{transform:scale(1)}}`}</style>
    </Screen>
  )
}

/* ───────────── Network globe ─────────────
   Dotted continents, real cities, lifted great-circle routes with packets. Drag to spin, tap a city. */
const LAND: [number, number, number, number][] = [
  // lat, lon, lat radius, lon radius (degrees): a rough hand-made world
  [50, -100, 18, 30], [62, -110, 10, 35], [30, -95, 12, 18], [17, -95, 7, 10], [70, -42, 9, 18],
  [-10, -60, 16, 14], [-32, -64, 12, 8],
  [50, 12, 10, 16], [62, 20, 8, 10], [42, 0, 5, 6],
  [10, 18, 16, 22], [-12, 26, 16, 12], [25, 15, 10, 20],
  [55, 90, 14, 50], [35, 100, 12, 22], [22, 78, 10, 8], [14, 103, 8, 7], [30, 50, 9, 12], [36, 138, 6, 4],
  [-25, 134, 10, 16], [-1, 115, 4, 14],
]
const CITIES: { n: string; lat: number; lon: number; v: number }[] = [
  { n: 'Kathmandu', lat: 27.7, lon: 85.3, v: 412 },
  { n: 'Berlin', lat: 52.5, lon: 13.4, v: 1284 },
  { n: 'New York', lat: 40.7, lon: -74, v: 2210 },
  { n: 'São Paulo', lat: -23.5, lon: -46.6, v: 864 },
  { n: 'Lagos', lat: 6.5, lon: 3.4, v: 530 },
  { n: 'Tokyo', lat: 35.7, lon: 139.7, v: 1902 },
  { n: 'Sydney', lat: -33.9, lon: 151.2, v: 640 },
  { n: 'Mumbai', lat: 19, lon: 72.8, v: 1120 },
]
const ROUTES = [[1, 2], [0, 1], [0, 5], [2, 3], [1, 4], [5, 6], [7, 1], [0, 7], [2, 5], [3, 4]]
export function GlobeDemo() {
  const [sel, setSel] = useState(0)
  const selRef = useRef(sel)
  selRef.current = sel
  const [live, setLive] = useState(9618)
  useEffect(() => {
    const t = window.setInterval(() => setLive((v) => v + ((Math.random() * 4) | 0)), 900)
    return () => window.clearInterval(t)
  }, [])
  const c = CITIES[sel]
  return (
    <Screen bg="#06182b" fg="#cfe8ff">
      <Stage
        make={({ w, h, ptr }) => {
          const D = Math.PI / 180
          const N = w < 300 ? 3600 : 4200
          const pts: { x: number; y: number; z: number; land: boolean }[] = []
          for (let i = 0; i < N; i++) {
            const y = 1 - (2 * (i + 0.5)) / N
            const lat = Math.asin(y) / D
            const lon = ((((i * 137.508) % 360) + 540) % 360) - 180
            const land = LAND.some(([a, b, ra, rb]) => {
              let dl = lon - b
              if (dl > 180) dl -= 360
              if (dl < -180) dl += 360
              return ((lat - a) / ra) ** 2 + (dl / rb) ** 2 < 1
            })
            pts.push({ x: Math.cos(lat * D) * Math.sin(lon * D), y: Math.sin(lat * D), z: Math.cos(lat * D) * Math.cos(lon * D), land })
          }
          const v3 = (lat: number, lon: number) => [Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D), Math.cos(lat * D) * Math.cos(lon * D)]
          const cityV = CITIES.map((q) => v3(q.lat, q.lon))
          // each route as a lifted arc of 40 points
          const arcs = ROUTES.map(([a, b]) => {
            const A = cityV[a]
            const B = cityV[b]
            const om = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])))
            return Array.from({ length: 41 }, (_, k) => {
              const t = k / 40
              const s1 = Math.sin((1 - t) * om) / Math.sin(om)
              const s2 = Math.sin(t * om) / Math.sin(om)
              const lift = 1 + Math.sin(t * Math.PI) * om * 0.22
              return [0, 1, 2].map((j) => (A[j] * s1 + B[j] * s2) * lift)
            })
          })
          let rot = -1.5
          let tilt = 0.35
          let vel = 0.25
          let lastX = 0
          let pressX = 0
          let pressY = 0
          let dragged = -1
          let focus = -1
          let swing: { to: number; tilt: number; k: number } | null = null
          const proj = (p: number[], R: number, cx: number, cy: number) => {
            const x = p[0] * Math.cos(rot) + p[2] * Math.sin(rot)
            const z = -p[0] * Math.sin(rot) + p[2] * Math.cos(rot)
            const y2 = p[1] * Math.cos(tilt) - z * Math.sin(tilt)
            const z2 = p[1] * Math.sin(tilt) + z * Math.cos(tilt)
            return { x: cx + x * R, y: cy - y2 * R, z: z2 }
          }
          return {
            press() {
              lastX = pressX = ptr.x
              pressY = ptr.y
              dragged = 0
            },
            draw(ctx, dt) {
              const R = Math.min(w, h) * 0.38
              const cx = w / 2
              const cy = h / 2 + 4
              if (ptr.down && ptr.inside) {
                const dx = ptr.x - lastX
                dragged += Math.abs(dx)
                vel = (dx * 0.008) / Math.max(dt, 0.008)
                lastX = ptr.x
              } else {
                if (dragged >= 0 && dragged < 6) {
                  // a tap: pick the nearest visible city
                  let best = -1
                  let bd = 30 * 30
                  cityV.forEach((v, i) => {
                    const s = proj(v, R, cx, cy)
                    const d = (s.x - pressX) ** 2 + (s.y - pressY) ** 2
                    if (s.z > 0 && d < bd) {
                      bd = d
                      best = i
                    }
                  })
                  if (best >= 0) setSel(best)
                }
                dragged = -1
                vel += (0.25 - vel) * dt * 0.8
              }
              // when a new city is chosen, swing it round to face us
              if (focus !== selRef.current) {
                focus = selRef.current
                vel = 0
                const q = CITIES[focus]
                let target = -q.lon * D
                while (target - rot > Math.PI) target -= Math.PI * 2
                while (target - rot < -Math.PI) target += Math.PI * 2
                swing = { to: target, tilt: Math.max(-0.4, Math.min(0.7, q.lat * D * 0.8)), k: 0 }
              }
              if (swing && swing.k < 1) {
                swing.k = Math.min(1, swing.k + dt * 1.4)
                rot += (swing.to - rot) * Math.min(1, dt * 4)
                tilt += (swing.tilt - tilt) * Math.min(1, dt * 4)
              } else rot += vel * dt
              ctx.fillStyle = '#06182b'
              ctx.fillRect(0, 0, w, h)
              const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.25)
              halo.addColorStop(0, 'rgba(79,179,255,0.16)')
              halo.addColorStop(1, 'rgba(79,179,255,0)')
              ctx.fillStyle = halo
              ctx.fillRect(0, 0, w, h)
              for (const p of pts) {
                const s = proj([p.x, p.y, p.z], R, cx, cy)
                if (s.z < -0.05) continue
                if (p.land) {
                  ctx.fillStyle = `rgba(170,220,255,${0.25 + s.z * 0.7})`
                  ctx.fillRect(s.x - 1, s.y - 1, 2.1, 2.1)
                } else {
                  ctx.fillStyle = `rgba(90,150,220,${0.1 + s.z * 0.2})`
                  ctx.fillRect(s.x, s.y, 1.3, 1.3)
                }
              }
              const t = performance.now() / 1000
              arcs.forEach((arc, ai) => {
                const hot = ROUTES[ai].includes(selRef.current)
                const ps = arc.map((p) => proj(p, R, cx, cy))
                ctx.strokeStyle = hot ? 'rgba(255,122,61,0.85)' : 'rgba(79,179,255,0.4)'
                ctx.lineWidth = hot ? 1.6 : 1
                ctx.beginPath()
                let on = false
                ps.forEach((s) => {
                  if (s.z > -0.02) on ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)
                  on = s.z > -0.02
                })
                ctx.stroke()
                const k = (t * (hot ? 0.35 : 0.22) + ai * 0.37) % 1
                for (let tr = 0; tr < 5; tr++) {
                  const kk = k - tr * 0.018
                  if (kk < 0) continue
                  const s = ps[Math.round(kk * 40)]
                  if (s.z < 0) continue
                  ctx.globalAlpha = 1 - tr * 0.2
                  ctx.fillStyle = hot ? '#ffd2b8' : '#ffffff'
                  const r = 2.4 - tr * 0.35
                  ctx.fillRect(s.x - r / 2, s.y - r / 2, r, r)
                }
                ctx.globalAlpha = 1
              })
              cityV.forEach((v, i) => {
                const s = proj(v, R, cx, cy)
                if (s.z < 0) return
                const isSel = i === selRef.current
                if (isSel) {
                  const ph = (t * 0.8) % 1
                  ctx.strokeStyle = `rgba(255,122,61,${1 - ph})`
                  ctx.lineWidth = 1.5
                  ctx.beginPath()
                  ctx.arc(s.x, s.y, 4 + ph * 16, 0, 6.283)
                  ctx.stroke()
                }
                ctx.fillStyle = isSel ? '#ff7a3d' : '#4fb3ff'
                ctx.beginPath()
                ctx.arc(s.x, s.y, isSel ? 4.5 : 3, 0, 6.283)
                ctx.fill()
                if (isSel || s.z > 0.75) {
                  ctx.font = `${isSel ? 800 : 700} 10.5px system-ui, sans-serif`
                  ctx.textAlign = 'left'
                  ctx.fillStyle = isSel ? '#fff' : 'rgba(207,232,255,0.6)'
                  ctx.fillText(CITIES[i].n, s.x + 7, s.y - 6)
                }
              })
            },
          }
        }}
      />
      <div className="pointer-events-none absolute inset-x-4 top-3.5 flex items-start justify-between">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] opacity-60">Live shipments</p>
          <p className="text-[22px] font-extrabold tabular-nums leading-tight text-white">{live.toLocaleString('en-US')}</p>
        </div>
        <div className="text-right">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em]" style={{ color: '#ff7a3d' }}>{c.n}</p>
          <p className="text-[13px] font-extrabold tabular-nums text-white">{c.v.toLocaleString('en-US')} / day</p>
          <p className="text-[10.5px] font-bold opacity-60">{ROUTES.filter((r) => r.includes(sel)).length} routes</p>
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-3 flex justify-center gap-1 overflow-x-auto">
        {CITIES.slice(0, 5).map((x, i) => (
          <button key={x.n} onClick={() => setSel(i)} aria-pressed={sel === i} className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold" style={{ background: sel === i ? '#ff7a3d' : 'rgba(207,232,255,0.1)', color: sel === i ? '#06182b' : '#cfe8ff' }}>
            {x.n}
          </button>
        ))}
      </div>
    </Screen>
  )
}

/* ───────────── Assistant on your content ─────────────
   Type a real question; it thinks, answers in your tone, cites the page it used and offers a next step. */
const KB = [
  { k: ['deliver', 'shipping', 'sunday', 'courier', 'ship'], a: 'Yes, every day including Sundays. Orders before 4 pm leave the same day and you can follow the courier live.', src: 'Shipping policy', act: 'Track an order' },
  { k: ['book', 'change', 'date', 'reschedul', 'appointment', 'cancel'], a: 'Sure. Tell me the new date and I will check what is free and move your booking. No fee up to 24 hours before.', src: 'Bookings FAQ', act: 'Pick a new date' },
  { k: ['pro', 'plan', 'price', 'cost', 'pay', 'much'], a: 'Pro is €29 a month: unlimited projects, custom domains, priority support and a monthly review call.', src: 'Pricing page', act: 'Start Pro trial' },
  { k: ['refund', 'return', 'broken', 'wrong'], a: 'Sorry about that. Returns are free within 30 days, and refunds land in 3 to 5 days once we scan the parcel.', src: 'Returns policy', act: 'Start a return' },
  { k: ['open', 'hour', 'time', 'when'], a: 'We are open 9 to 7 on weekdays and 10 to 4 on weekends. Chat with me any time though.', src: 'Contact page', act: 'Get directions' },
  { k: ['hi', 'hello', 'hey'], a: 'Hi! Ask me about delivery, bookings, plans or returns. I answer from this site only.', src: 'Welcome', act: 'Show topics' },
]
type Msg = { me: boolean; t: string; src?: string; act?: string }
export function AssistantDemo() {
  const [log, setLog] = useState<Msg[]>([{ me: false, t: 'Hi! I know everything on this site. What can I help with?' }])
  const [typed, setTyped] = useState(0)
  const [thinking, setThinking] = useState(false)
  const [val, setVal] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const last = log[log.length - 1]
  useEffect(() => {
    if (last.me) return
    setTyped(0)
    const t0 = performance.now()
    const t = window.setInterval(() => {
      const n = Math.min(last.t.length, Math.floor((performance.now() - t0) / 13))
      setTyped(n)
      if (n >= last.t.length) window.clearInterval(t)
    }, 26)
    return () => window.clearInterval(t)
  }, [last])
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log.length, typed, thinking])
  const ask = (q: string) => {
    if (!q.trim() || thinking) return
    setLog((l) => [...l, { me: true, t: q }])
    setVal('')
    setThinking(true)
    const low = q.toLowerCase()
    const hit = KB.find((x) => x.k.some((k) => low.includes(k)))
    window.setTimeout(() => {
      setThinking(false)
      setLog((l) => [...l.slice(-5), hit ? { me: false, t: hit.a, src: hit.src, act: hit.act } : { me: false, t: 'I could not find that on this site yet, so I have passed it to the team. They reply within the hour.', src: 'Handoff', act: 'Leave your email' }])
    }, 900)
  }
  return (
    <Screen bg="#1b1340" fg="#f3eeff">
      <div className="flex h-full flex-col p-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#2fd0a0] shadow-[0_0_8px_#2fd0a0]" />
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] opacity-70">Assistant · online</p>
        </div>
        <div ref={scroller} className="mt-2.5 flex flex-1 flex-col gap-2 overflow-y-auto pr-1 [scrollbar-width:none]">
          {log.map((m, i) => {
            const isLast = i === log.length - 1
            const text = !m.me && isLast ? m.t.slice(0, typed) : m.t
            const doneTyping = !isLast || typed >= m.t.length
            return m.me ? (
              <div key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-white/15 px-3 py-1.5 text-[13px] font-bold">{m.t}</div>
            ) : (
              <div key={i} className="w-fit max-w-[94%]">
                <div className="rounded-2xl rounded-bl-md px-3 py-2 text-[13px] font-bold leading-snug" style={{ background: 'rgba(139,123,255,0.28)' }}>
                  {text}
                  {!doneTyping && <span className="ml-0.5 inline-block h-[13px] w-[2px] translate-y-0.5 animate-pulse" style={{ background: '#c7bdff' }} />}
                </div>
                {m.src && doneTyping && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold opacity-80">↳ {m.src}</span>
                    <button className="rounded-full px-2 py-0.5 text-[10.5px] font-extrabold" style={{ background: '#8b7bff', color: '#14082a' }}>{m.act} →</button>
                  </div>
                )}
              </div>
            )
          })}
          {thinking && (
            <div className="flex w-fit gap-1 rounded-2xl rounded-bl-md px-3 py-2.5" style={{ background: 'rgba(139,123,255,0.28)' }}>
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c7bdff]" style={{ animationDelay: `${d * 0.12}s` }} />
              ))}
            </div>
          )}
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {['Sunday delivery?', 'Change booking', 'What does Pro cost?', 'Refunds'].map((s) => (
            <button key={s} onClick={() => ask(s)} className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold hover:bg-white/20">{s}</button>
          ))}
        </div>
        <form
          className="mt-2 flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            ask(val)
          }}
        >
          <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Ask your own question…" aria-label="Ask the assistant" className="min-w-0 flex-1 rounded-full bg-white/10 px-3 py-2 text-[13px] font-bold outline-none placeholder:text-white/40" />
          <button aria-label="Send" className="grid h-9 w-9 place-items-center rounded-full text-[15px] font-extrabold" style={{ background: '#8b7bff', color: '#14082a' }}>↑</button>
        </form>
      </div>
    </Screen>
  )
}
