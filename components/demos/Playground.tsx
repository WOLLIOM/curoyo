'use client'

import { useEffect, useRef, useState } from 'react'

// Four small live pieces of what a studio can put inside a website. Each is a self-contained dark "screen".
interface Ptr { x: number; y: number; down: boolean; inside: boolean }
export interface Api { w: number; h: number; ptr: Ptr }
export type Scene = { draw: (ctx: CanvasRenderingContext2D, dt: number) => void; press?: () => void }

const HOT = '#ff7a3d'
const rand = (a: number, b: number) => a + Math.random() * (b - a)

export function Stage({ make, noScroll }: { make: (a: Api) => Scene; noScroll?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const makeRef = useRef(make)
  makeRef.current = make

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ptr: Ptr = { x: -999, y: -999, down: false, inside: false }
    const api: Api = { w: 0, h: 0, ptr }
    let scene = null as Scene | null
    let dpr = 1
    const resize = () => {
      const r = cv.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      api.w = Math.max(10, r.width)
      api.h = Math.max(10, r.height)
      cv.width = api.w * dpr
      cv.height = api.h * dpr
      scene = makeRef.current(api)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    const pos = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      ptr.x = e.clientX - r.left
      ptr.y = e.clientY - r.top
    }
    const move = (e: PointerEvent) => {
      pos(e)
      ptr.inside = true
    }
    const down = (e: PointerEvent) => {
      pos(e)
      ptr.down = true
      ptr.inside = true
      scene?.press?.()
    }
    const up = () => {
      ptr.down = false
    }
    const leave = () => {
      ptr.inside = false
      ptr.down = false
      ptr.x = -999
      ptr.y = -999
    }
    cv.addEventListener('pointermove', move)
    cv.addEventListener('pointerdown', down)
    cv.addEventListener('pointerup', up)
    cv.addEventListener('pointerleave', leave)
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = 0
      const dt = Math.min(0.04, (now - last) / 1000)
      last = now
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      scene?.draw(ctx, dt)
      raf = requestAnimationFrame(tick)
    }
    // Only run while on screen: a page of demos must not all animate at once.
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !reduced && !raf) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      } else if (!e.isIntersecting && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }, { rootMargin: '120px' })
    io.observe(cv)
    if (reduced) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      for (let i = 0; i < 40; i++) scene?.draw(ctx, 0.03)
    }
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      cv.removeEventListener('pointermove', move)
      cv.removeEventListener('pointerdown', down)
      cv.removeEventListener('pointerup', up)
      cv.removeEventListener('pointerleave', leave)
    }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" style={{ touchAction: noScroll ? 'none' : 'pan-y' }} />
}

export const rgba = (hex: string, a: number) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',')},${a})`

export const Screen = ({ children, bg = '#0b0a0c', fg = '#fff1e2' }: { children: React.ReactNode; bg?: string; fg?: string }) => (
  <div className="relative h-full w-full overflow-hidden rounded-[22px]" style={{ background: bg, color: fg }}>
    {children}
  </div>
)

/* 1. Type anything and it assembles from particles; the cursor scatters it. */
export function WordDemo({ bg = '#0b0a0c', fg = '#fff1e2', acc = HOT }: { bg?: string; fg?: string; acc?: string }) {
  const [word, setWord] = useState('hello')
  const wordRef = useRef(word)
  wordRef.current = word

  return (
    <Screen bg={bg} fg={fg}>
      <Stage
        make={({ w, h, ptr }) => {
          const N = w > 260 ? 1500 : 1200
          const px = new Float32Array(N)
          const py = new Float32Array(N)
          const vx = new Float32Array(N)
          const vy = new Float32Array(N)
          const tx = new Float32Array(N)
          const ty = new Float32Array(N)
          for (let i = 0; i < N; i++) {
            px[i] = rand(0, w)
            py[i] = rand(0, h)
          }
          let shown = ''
          let t = 0
          const sz = new Float32Array(N).map(() => rand(1.6, 3.2))
          const alt = new Uint8Array(N).map(() => (Math.random() < 0.16 ? 1 : 0))
          const sample = (txt: string) => {
            const off = document.createElement('canvas')
            off.width = Math.floor(w)
            off.height = Math.floor(h)
            const o = off.getContext('2d') as CanvasRenderingContext2D
            let size = h * 0.5
            o.font = `800 ${size}px system-ui, sans-serif`
            const mw = o.measureText(txt || ' ').width
            if (mw > w * 0.86) size *= (w * 0.86) / mw
            o.font = `800 ${size}px system-ui, sans-serif`
            o.textAlign = 'center'
            o.textBaseline = 'middle'
            o.fillText(txt, w / 2, h * 0.42)
            const d = o.getImageData(0, 0, off.width, off.height).data
            const pts: number[] = []
            const step = Math.max(2, Math.round(size / 28))
            for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) if (d[(y * off.width + x) * 4 + 3] > 128) pts.push(x, y)
            for (let i = 0; i < N; i++) {
              const k = pts.length ? ((Math.random() * (pts.length / 2)) | 0) * 2 : 0
              tx[i] = pts[k] ?? w / 2
              ty[i] = pts[k + 1] ?? h / 2
            }
          }
          return {
            // A tap blows the word apart; it pours back together.
            press() {
              for (let i = 0; i < N; i++) {
                const dx = px[i] - ptr.x
                const dy = py[i] - ptr.y
                const d = Math.hypot(dx, dy) + 8
                const f = Math.max(0, 1 - d / 260) * 26
                vx[i] += (dx / d) * f + rand(-2, 2)
                vy[i] += (dy / d) * f + rand(-2, 2)
              }
            },
            draw(ctx, dt) {
              t += dt
              if (wordRef.current !== shown) {
                shown = wordRef.current
                sample(shown.slice(0, 14))
              }
              ctx.fillStyle = rgba(bg, 0.32)
              ctx.fillRect(0, 0, w, h)
              for (let i = 0; i < N; i++) {
                // targets breathe with a slow wave so the word is never dead still
                const wx = tx[i] + Math.sin(t * 1.6 + ty[i] * 0.05) * 1.6
                const wy = ty[i] + Math.cos(t * 1.3 + tx[i] * 0.04) * 1.6
                let ax = (wx - px[i]) * 9
                let ay = (wy - py[i]) * 9
                const dx = px[i] - ptr.x
                const dy = py[i] - ptr.y
                const d2 = dx * dx + dy * dy
                if (d2 < 85 * 85) {
                  const d = Math.sqrt(d2) + 1
                  const f = (1 - d / 85) * 1000
                  // push out with a little twist around the cursor
                  ax += (dx / d) * f + (-dy / d) * f * 0.3
                  ay += (dy / d) * f + (dx / d) * f * 0.3
                }
                vx[i] = (vx[i] + ax * dt) * 0.9
                vy[i] = (vy[i] + ay * dt) * 0.9
                px[i] += vx[i] * dt * 60
                py[i] += vy[i] * dt * 60
                const sp = Math.hypot(vx[i], vy[i])
                ctx.fillStyle = alt[i] ? fg : acc
                ctx.globalAlpha = 0.6 + Math.min(0.4, sp * 0.05)
                const s = sz[i] * (1 + Math.min(0.6, sp * 0.04))
                ctx.fillRect(px[i] - s / 2, py[i] - s / 2, s, s)
              }
              ctx.globalAlpha = 1
            },
          }
        }}
      />
      <input
        value={word}
        onChange={(e) => setWord(e.target.value)}
        maxLength={14}
        aria-label="Type a word"
        placeholder="type a word"
        className="absolute inset-x-4 bottom-4 rounded-full px-4 py-2.5 text-center text-[15px] font-bold outline-none placeholder:opacity-50"
        style={{ background: rgba(fg, 0.14), color: fg }}
      />
    </Screen>
  )
}

/* 2. Click to drop a sun; a swarm falls into orbit around it. */
export function GravityDemo({ bg = '#0b0a0c', fg = '#ffd9b8', acc = HOT }: { bg?: string; fg?: string; acc?: string }) {
  return (
    <Screen bg={bg} fg={fg}>
      <Stage
        make={({ w, h, ptr }) => {
          // Suns attract; every third one dropped is a white hole that pushes. Drag any of them around.
          type Well = { x: number; y: number; m: number; push: boolean; born: number }
          const wells: Well[] = [{ x: w / 2, y: h / 2, m: 1, push: false, born: 1 }]
          let drops = 0
          let held: Well | null = null
          let t = 0
          const N = w > 260 ? 1000 : 800
          const p = Array.from({ length: N }, () => {
            const a = rand(0, 6.28)
            const r = rand(30, Math.min(w, h) * 0.45)
            // near-circular orbit speed for the softened pull, a touch slow so orbits are ellipses
            const v = Math.sqrt((9.6e6 * r * r) / Math.pow(r * r + 900, 1.5)) * rand(0.75, 0.95)
            return { x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r, vx: -Math.sin(a) * v, vy: Math.cos(a) * v, ox: 0, oy: 0 }
          })
          const buckets: number[][] = [[], [], []]
          const cols = [rgba(acc, 0.55), acc, fg]
          return {
            press() {
              held = wells.find((g) => Math.hypot(g.x - ptr.x, g.y - ptr.y) < 26) ?? null
              if (held) return
              drops++
              wells.push({ x: ptr.x, y: ptr.y, m: 1, push: drops % 3 === 0, born: 0 })
              if (wells.length > 5) wells.splice(1, 1)
            },
            draw(ctx, dt) {
              t += dt
              if (held && ptr.down) {
                held.x += (ptr.x - held.x) * Math.min(1, dt * 20)
                held.y += (ptr.y - held.y) * Math.min(1, dt * 20)
              } else held = null
              ctx.fillStyle = rgba(bg, 0.2)
              ctx.fillRect(0, 0, w, h)
              buckets.forEach((b) => (b.length = 0))
              for (const q of p) {
                q.ox = q.x
                q.oy = q.y
                for (const g of wells) {
                  const dx = g.x - q.x
                  const dy = g.y - q.y
                  const d2 = dx * dx + dy * dy + 900
                  const f = ((g.push ? -0.7 : 1) * g.m * g.born * 160000) / (d2 * Math.sqrt(d2))
                  q.vx += dx * f * dt * 60
                  q.vy += dy * f * dt * 60
                }
                q.x += q.vx * dt
                q.y += q.vy * dt
                if (q.x < -40 || q.x > w + 40 || q.y < -40 || q.y > h + 40) {
                  const pulls = wells.filter((g) => !g.push)
                  const g = pulls[(Math.random() * pulls.length) | 0] ?? { x: w / 2, y: h / 2 }
                  const a = rand(0, 6.28)
                  const r = rand(50, 90)
                  q.x = q.ox = g.x + Math.cos(a) * r
                  q.y = q.oy = g.y + Math.sin(a) * r
                  q.vx = -Math.sin(a) * 290
                  q.vy = Math.cos(a) * 290
                }
                const s = Math.hypot(q.vx, q.vy)
                buckets[s > 330 ? 2 : s > 190 ? 1 : 0].push(q.ox, q.oy, q.x, q.y)
              }
              // streaks, batched by speed so it stays one stroke per colour
              ctx.lineWidth = 1.6
              ctx.lineCap = 'round'
              buckets.forEach((b, k) => {
                ctx.strokeStyle = cols[k]
                ctx.beginPath()
                for (let i = 0; i < b.length; i += 4) {
                  ctx.moveTo(b[i], b[i + 1])
                  ctx.lineTo(b[i + 2] + 0.01, b[i + 3])
                }
                ctx.stroke()
              })
              for (const g of wells) {
                g.born = Math.min(1, g.born + dt * 1.5)
                const R = (22 + Math.sin(t * 3 + g.x) * 3) * g.born
                const gr = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, R * 1.6)
                gr.addColorStop(0, g.push ? rgba(bg, 1) : rgba(fg, 0.95))
                gr.addColorStop(0.35, g.push ? rgba(fg, 0.5) : rgba(acc, 0.6))
                gr.addColorStop(1, rgba(acc, 0))
                ctx.fillStyle = gr
                ctx.beginPath()
                ctx.arc(g.x, g.y, R * 1.6, 0, 6.283)
                ctx.fill()
                if (g.push) {
                  ctx.strokeStyle = rgba(fg, 0.7)
                  ctx.lineWidth = 1.5
                  ctx.beginPath()
                  ctx.arc(g.x, g.y, R * 0.55, 0, 6.283)
                  ctx.stroke()
                }
              }
              ctx.textAlign = 'left'
              ctx.font = '800 11px system-ui, sans-serif'
              ctx.fillStyle = rgba(fg, 0.55)
              ctx.fillText(`${wells.filter((g) => !g.push).length} suns · ${wells.filter((g) => g.push).length} white holes · ${N} bodies`, 14, 22)
            },
          }
        }}
      />
      <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[13px] font-bold opacity-60">Click to drop · drag a sun to move it</p>
    </Screen>
  )
}

/* 3. A tiny game: the red panda catches fruit and bamboo, and dodges rocks. */
export function PandaGame() {
  return (
    <Screen>
      <Stage
        noScroll
        make={({ w, h, ptr }) => {
          type Item = { x: number; y: number; v: number; kind: 0 | 1 | 2; r: number }
          let items: Item[] = []
          let px = w / 2
          let score = 0
          let best = 0
          let lives = 3
          let state: 'idle' | 'play' | 'over' = 'idle'
          let spawn = 0
          let t = 0
          const start = () => {
            items = []
            score = 0
            lives = 3
            state = 'play'
            spawn = 0
          }
          const panda = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
            ctx.fillStyle = '#b9391a'
            ctx.beginPath()
            ctx.arc(x - 17, y - 15, 8, 0, 6.3)
            ctx.arc(x + 17, y - 15, 8, 0, 6.3)
            ctx.fill()
            ctx.fillStyle = '#e8541f'
            ctx.beginPath()
            ctx.arc(x, y, 24, 0, 6.3)
            ctx.fill()
            ctx.fillStyle = '#fff1e2'
            ctx.beginPath()
            ctx.ellipse(x - 13, y + 5, 8, 7, 0.4, 0, 6.3)
            ctx.ellipse(x + 13, y + 5, 8, 7, -0.4, 0, 6.3)
            ctx.ellipse(x, y + 9, 7, 5, 0, 0, 6.3)
            ctx.fill()
            ctx.fillStyle = '#1a0a05'
            ctx.beginPath()
            ctx.arc(x - 9, y - 3, 2.6, 0, 6.3)
            ctx.arc(x + 9, y - 3, 2.6, 0, 6.3)
            ctx.arc(x, y + 6, 3, 0, 6.3)
            ctx.fill()
          }
          return {
            press() {
              if (state !== 'play') start()
            },
            draw(ctx, dt) {
              t += dt
              ctx.fillStyle = '#0b0a0c'
              ctx.fillRect(0, 0, w, h)
              const tx = state === 'play' && ptr.inside ? ptr.x : w / 2 + Math.sin(t * 1.4) * w * 0.3
              px += (Math.max(30, Math.min(w - 30, tx)) - px) * Math.min(1, dt * 12)
              const py = h - 52
              if (state === 'play') {
                spawn -= dt
                if (spawn < 0) {
                  spawn = Math.max(0.35, 0.9 - score * 0.012)
                  const k = Math.random()
                  items.push({ x: rand(24, w - 24), y: -20, v: rand(110, 160) + score * 2.2, kind: k < 0.45 ? 0 : k < 0.75 ? 1 : 2, r: 11 })
                }
              } else if (Math.random() < dt * 1.2) {
                items.push({ x: rand(24, w - 24), y: -20, v: rand(90, 130), kind: Math.random() < 0.5 ? 0 : 1, r: 11 })
              }
              for (const it of items) {
                it.y += it.v * dt
                if (it.kind === 0) {
                  ctx.fillStyle = '#ff4a2a'
                  ctx.beginPath()
                  ctx.arc(it.x, it.y, it.r, 0, 6.3)
                  ctx.fill()
                  ctx.fillStyle = '#7bd36a'
                  ctx.fillRect(it.x - 1, it.y - it.r - 4, 2, 5)
                } else if (it.kind === 1) {
                  ctx.fillStyle = '#8fd06b'
                  ctx.fillRect(it.x - 4, it.y - 16, 8, 32)
                  ctx.fillStyle = '#4c8a3a'
                  ctx.fillRect(it.x - 4, it.y - 2, 8, 2)
                } else {
                  ctx.fillStyle = '#7a7480'
                  ctx.beginPath()
                  ctx.arc(it.x, it.y, 13, 0, 6.3)
                  ctx.fill()
                }
                if (state === 'play' && Math.abs(it.y - py) < 24 && Math.abs(it.x - px) < 28) {
                  if (it.kind === 2) lives--
                  else score++
                  it.y = h + 99
                }
              }
              items = items.filter((it) => it.y < h + 40)
              if (state === 'play' && lives <= 0) {
                state = 'over'
                best = Math.max(best, score)
              }
              panda(ctx, px, py)
              ctx.textAlign = 'center'
              ctx.fillStyle = '#fff1e2'
              if (state === 'play') {
                ctx.font = '800 22px system-ui, sans-serif'
                ctx.textAlign = 'left'
                ctx.fillText(String(score), 16, 34)
                ctx.fillStyle = HOT
                ctx.textAlign = 'right'
                ctx.fillText('♥'.repeat(lives), w - 16, 34)
              } else {
                ctx.fillStyle = 'rgba(11,10,12,0.6)'
                ctx.fillRect(0, h * 0.2, w, 96)
                ctx.fillStyle = '#fff1e2'
                ctx.font = '800 26px system-ui, sans-serif'
                ctx.fillText(state === 'over' ? `Score ${score}` : 'Catch the fruit', w / 2, h * 0.2 + 38)
                ctx.font = '700 14px system-ui, sans-serif'
                ctx.fillStyle = HOT
                ctx.fillText(state === 'over' ? `Best ${best} · tap to retry` : 'Skip the rocks · tap to start', w / 2, h * 0.2 + 66)
              }
            },
          }
        }}
      />
    </Screen>
  )
}

/* 4. A landscape that follows the time of day: sky, sun and moon, clouds, a lake that mirrors it all,
   a cabin that lights up at dusk, birds by day and fireflies by night. */
const SKY: number[][][] = [
  [[6, 8, 24], [18, 24, 58]],
  [[255, 138, 92], [96, 82, 156]],
  [[96, 170, 236], [196, 228, 255]],
  [[255, 116, 66], [62, 40, 104]],
  [[6, 8, 24], [18, 24, 58]],
]
const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k)
const rgb = (c: number[], a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`

export function DaylightDemo() {
  const [t, setT] = useState(0.3)
  const tRef = useRef(t)
  const touched = useRef(false)
  const hh = Math.floor(t * 24)
  const mm = Math.floor((t * 24 * 60) % 60)
  return (
    <Screen>
      <Stage
        make={({ w, h }) => {
          // Ridges are fixed pseudo-random profiles, so the range holds still frame to frame.
          const ridgeLine = (seed: number, base: number, amp: number) => {
            const pts: number[] = []
            let s = seed
            const r = () => (s = (s * 9301 + 49297) % 233280) / 233280
            const o = [r() * 6, r() * 6, r() * 6]
            for (let x = 0; x <= w + 8; x += 6) {
              const u = x / w
              pts.push(x, base - amp * (0.55 * Math.abs(Math.sin(u * 3.1 + o[0])) + 0.3 * Math.abs(Math.sin(u * 7.3 + o[1])) + 0.15 * Math.sin(u * 17 + o[2])))
            }
            return pts
          }
          const horizon = h * 0.6
          const R1 = ridgeLine(7, horizon, h * 0.3)
          const R2 = ridgeLine(31, horizon, h * 0.17)
          const stars = Array.from({ length: 70 }, () => ({ x: rand(0, w), y: rand(0, horizon * 0.85), r: rand(0.4, 1.4), ph: rand(0, 6) }))
          const clouds = Array.from({ length: 5 }, (_, i) => ({ x: rand(0, w), y: rand(h * 0.08, h * 0.3), s: rand(0.6, 1.2), v: rand(4, 10), seed: i }))
          const birds = Array.from({ length: 4 }, (_, i) => ({ x: rand(-w, 0), y: rand(h * 0.15, h * 0.35), ph: i }))
          const flies = Array.from({ length: 16 }, () => ({ x: rand(0, w), y: rand(horizon + 8, h - 40), ph: rand(0, 6) }))
          const smoke: { x: number; y: number; a: number; r: number }[] = []
          let clock = 0
          const fillRidge = (ctx: CanvasRenderingContext2D, pts: number[], c: string) => {
            ctx.fillStyle = c
            ctx.beginPath()
            ctx.moveTo(0, horizon + 1)
            for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
            ctx.lineTo(w, horizon + 1)
            ctx.closePath()
            ctx.fill()
          }
          return {
            draw(ctx, dt) {
              const prevTick = (clock * 10) | 0
              clock += dt
              if (!touched.current) {
                tRef.current = (tRef.current + dt / 26) % 1
                if (((clock * 10) | 0) !== prevTick) setT(tRef.current) // clock readout, 10x a second
              }
              const T = tRef.current
              const seg = T * 4
              const i = Math.min(3, Math.floor(seg))
              const k = seg - i
              const top = mix(SKY[i][0], SKY[i + 1][0], k)
              const bot = mix(SKY[i][1], SKY[i + 1][1], k)
              const light = Math.max(0, Math.min(1, 0.5 - Math.cos(T * Math.PI * 2) * 0.62))
              const night = 1 - Math.min(1, light * 1.6)
              const warm = Math.max(0, 1 - Math.abs(Math.cos(T * Math.PI * 2)) * 1.6) * (1 - night * 0.6)

              // sky and stars
              const g = ctx.createLinearGradient(0, 0, 0, horizon)
              g.addColorStop(0, rgb(top))
              g.addColorStop(1, rgb(bot))
              ctx.fillStyle = g
              ctx.fillRect(0, 0, w, horizon + 1)
              for (const s of stars) {
                const a = night * (0.4 + 0.6 * Math.abs(Math.sin(clock * 1.3 + s.ph)))
                if (a < 0.03) continue
                ctx.fillStyle = `rgba(255,255,255,${a})`
                ctx.fillRect(s.x, s.y, s.r, s.r)
              }
              // sun and moon ride the same arc
              const arcP = (p: number) => ({ x: w * 0.06 + p * w * 0.88, y: horizon - Math.sin(p * Math.PI) * horizon * 0.82 })
              const sunP = (T - 0.22) / 0.56
              const moonP = (((T + 0.5) % 1) - 0.22) / 0.56
              const sunUp = sunP > -0.05 && sunP < 1.05
              const moonUp = moonP > -0.05 && moonP < 1.05
              if (sunUp) {
                const s = arcP(sunP)
                const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 70)
                glow.addColorStop(0, `rgba(255,220,160,${0.55 + warm * 0.3})`)
                glow.addColorStop(1, 'rgba(255,200,140,0)')
                ctx.fillStyle = glow
                ctx.fillRect(s.x - 70, s.y - 70, 140, 140)
                ctx.fillStyle = warm > 0.3 ? '#ffc58a' : '#fff0cc'
                ctx.beginPath()
                ctx.arc(s.x, s.y, 13, 0, 6.283)
                ctx.fill()
              }
              if (moonUp) {
                const m = arcP(moonP)
                ctx.fillStyle = '#eef4ff'
                ctx.beginPath()
                ctx.arc(m.x, m.y, 9, 0, 6.283)
                ctx.fill()
                ctx.fillStyle = rgb(mix(top, bot, 0.3))
                ctx.beginPath()
                ctx.arc(m.x + 4, m.y - 2, 8, 0, 6.283)
                ctx.fill()
              }
              // clouds, warm at the edges of the day
              const cc = mix(mix([60, 66, 100], [255, 255, 255], light), [255, 160, 120], warm * 0.6)
              ctx.fillStyle = rgb(cc, 0.75)
              for (const c of clouds) {
                c.x += c.v * dt
                if (c.x > w + 60) c.x = -60
                ctx.beginPath()
                for (let b = 0; b < 5; b++) {
                  const bx = c.x + (b - 2) * 11 * c.s
                  const by = c.y - Math.sin((b / 4) * Math.PI) * 7 * c.s
                  const br = (8 + ((b * 7 + c.seed) % 4)) * c.s
                  ctx.moveTo(bx + br, by)
                  ctx.arc(bx, by, br, 0, 6.283)
                }
                ctx.fill()
              }
              // birds by day
              if (light > 0.4) {
                ctx.strokeStyle = `rgba(30,30,46,${light})`
                ctx.lineWidth = 1.4
                for (const b of birds) {
                  b.x += dt * 22
                  if (b.x > w + 20) b.x = rand(-w * 0.6, -20)
                  const f = Math.sin(clock * 7 + b.ph) * 3
                  ctx.beginPath()
                  ctx.moveTo(b.x - 6, b.y - f)
                  ctx.quadraticCurveTo(b.x - 3, b.y - 3, b.x, b.y)
                  ctx.quadraticCurveTo(b.x + 3, b.y - 3, b.x + 6, b.y - f)
                  ctx.stroke()
                }
              }
              // mountains: the far range takes the sky's tint, snow catches the light
              const far = mix(mix(bot, [40, 46, 80], 0.55), [10, 12, 24], night * 0.5)
              const near = mix(mix(bot, [24, 28, 50], 0.8), [6, 8, 16], night * 0.6)
              fillRidge(ctx, R1, rgb(far))
              // snow above a wavy snowline, clipped to the far range
              ctx.save()
              ctx.beginPath()
              ctx.moveTo(0, horizon)
              for (let j = 0; j < R1.length; j += 2) ctx.lineTo(R1[j], R1[j + 1])
              ctx.lineTo(w, horizon)
              ctx.clip()
              ctx.fillStyle = rgb(mix([255, 255, 255], [255, 170, 120], warm), 0.2 + light * 0.55)
              ctx.beginPath()
              ctx.moveTo(0, 0)
              for (let x = 0; x <= w; x += 8) ctx.lineTo(x, horizon - h * 0.2 + Math.sin(x * 0.11) * 5 + Math.sin(x * 0.37) * 3)
              ctx.lineTo(w, 0)
              ctx.fill()
              ctx.restore()
              fillRidge(ctx, R2, rgb(near))
              // lake: the sky mirrored and darkened, with the near range reflected
              const lg = ctx.createLinearGradient(0, horizon, 0, h)
              lg.addColorStop(0, rgb(mix(bot, [0, 0, 0], 0.35)))
              lg.addColorStop(1, rgb(mix(top, [0, 0, 0], 0.55)))
              ctx.fillStyle = lg
              ctx.fillRect(0, horizon, w, h - horizon)
              ctx.save()
              ctx.globalAlpha = 0.45
              ctx.translate(0, horizon * 2)
              ctx.scale(1, -1)
              fillRidge(ctx, R2, rgb(mix(near, [0, 0, 0], 0.3)))
              ctx.restore()
              const src = sunUp && sunP > 0 && sunP < 1 ? arcP(sunP) : moonUp && moonP > 0 && moonP < 1 ? arcP(moonP) : null
              if (src) {
                ctx.fillStyle = sunUp ? 'rgba(255,214,160,0.75)' : 'rgba(220,234,255,0.6)'
                for (let r = 0; r < 14; r++) {
                  const y = horizon + 5 + r * ((h - horizon - 40) / 14)
                  const ww = (6 + r * 2.2) * (0.5 + 0.5 * Math.sin(clock * 3 + r * 1.7))
                  ctx.fillRect(src.x - ww / 2 + Math.sin(clock * 2 + r) * 3, y, ww, 1.4)
                }
              }
              ctx.strokeStyle = 'rgba(255,255,255,0.08)'
              ctx.lineWidth = 1
              ctx.beginPath()
              for (let r = 0; r < 6; r++) {
                const y = horizon + 10 + r * 16 + ((clock * 6) % 16)
                ctx.moveTo(w * 0.1 + r * 13, y)
                ctx.lineTo(w * 0.35 + r * 9, y)
              }
              ctx.stroke()
              // shore, cabin, smoke, pines
              ctx.fillStyle = rgb(mix([28, 34, 30], [6, 8, 10], night))
              ctx.beginPath()
              ctx.moveTo(w * 0.5, horizon + 30)
              ctx.quadraticCurveTo(w * 0.72, horizon + 14, w, horizon + 18)
              ctx.lineTo(w, h)
              ctx.lineTo(w * 0.42, h)
              ctx.closePath()
              ctx.fill()
              const hx = w * 0.74
              const hy = horizon + 20
              const lamp = Math.max(0, night * 1.2 - 0.1)
              if (lamp > 0.1) {
                const lg2 = ctx.createRadialGradient(hx, hy - 6, 0, hx, hy - 6, 50)
                lg2.addColorStop(0, `rgba(255,170,80,${lamp * 0.35})`)
                lg2.addColorStop(1, 'rgba(255,170,80,0)')
                ctx.fillStyle = lg2
                ctx.fillRect(hx - 50, hy - 56, 100, 100)
              }
              ctx.fillStyle = rgb(mix([150, 70, 40], [30, 16, 12], night))
              ctx.fillRect(hx - 18, hy - 16, 36, 18)
              ctx.fillStyle = rgb(mix([90, 40, 26], [16, 8, 6], night))
              ctx.beginPath()
              ctx.moveTo(hx - 22, hy - 15)
              ctx.lineTo(hx, hy - 31)
              ctx.lineTo(hx + 22, hy - 15)
              ctx.closePath()
              ctx.fill()
              ctx.fillRect(hx + 8, hy - 34, 5, 12)
              ctx.fillStyle = `rgba(255,190,90,${0.15 + lamp * 0.85})`
              ctx.fillRect(hx - 12, hy - 11, 7, 7)
              ctx.fillRect(hx + 5, hy - 11, 7, 7)
              if (Math.random() < dt * 4) smoke.push({ x: hx + 10, y: hy - 36, a: 0.5, r: 2 })
              for (const s of smoke) {
                s.y -= dt * 10
                s.x += dt * 6
                s.r += dt * 3
                s.a -= dt * 0.15
              }
              while (smoke.length && smoke[0].a <= 0) smoke.shift()
              for (const s of smoke) {
                ctx.fillStyle = rgb(mix([230, 230, 235], [120, 120, 140], night), s.a)
                ctx.beginPath()
                ctx.arc(s.x, s.y, s.r, 0, 6.283)
                ctx.fill()
              }
              ctx.fillStyle = rgb(mix([24, 60, 40], [4, 10, 8], night))
              for (const [px, ps] of [[0.55, 1], [0.6, 1.3], [0.88, 1.1], [0.94, 1.4], [0.98, 0.9]]) {
                const x = px * w
                const y = horizon + 26 - (px - 0.5) * 12
                ctx.beginPath()
                ctx.moveTo(x, y - 30 * ps)
                ctx.lineTo(x + 8 * ps, y)
                ctx.lineTo(x - 8 * ps, y)
                ctx.closePath()
                ctx.fill()
              }
              // fireflies after dark
              if (night > 0.3) {
                for (const f of flies) {
                  f.x += Math.sin(clock + f.ph) * dt * 8
                  f.y += Math.cos(clock * 0.8 + f.ph) * dt * 5
                  ctx.fillStyle = `rgba(255,236,140,${night * Math.max(0, Math.sin(clock * 2 + f.ph)) ** 3})`
                  ctx.fillRect(f.x, f.y, 2, 2)
                }
              }
            },
          }
        }}
      />
      <p className="pointer-events-none absolute left-4 top-3.5 text-[22px] font-extrabold tabular-nums text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]">
        {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}
      </p>
      <label className="absolute inset-x-5 bottom-4 flex items-center gap-3 text-[13px] font-bold text-white/80">
        <span>Time</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={t}
          onChange={(e) => {
            touched.current = true
            tRef.current = parseFloat(e.target.value)
            setT(tRef.current)
          }}
          aria-label="Time of day"
          className="h-1 w-full cursor-pointer accent-[#ff7a3d]"
        />
      </label>
    </Screen>
  )
}
