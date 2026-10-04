'use client'

import { useEffect, useRef } from 'react'
import { live } from '@/lib/store'

// Small objects made of grains, floating at different depths either side of the content. Near ones are large and move
// quickly, far ones are small and slow, so moving the mouse, scrolling or tilting a phone shows real depth.
type P3 = [number, number, number, number] // x, y, z, tone (0 ink, 1 accent)

const R = Math.random
const sphere = (n: number, r: number, tone = 0): P3[] =>
  Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n
    const rr = Math.sqrt(1 - y * y)
    const th = i * 2.399
    return [Math.cos(th) * rr * r, y * r, Math.sin(th) * rr * r, tone]
  })
const ring = (n: number, r: number, plane: 'xy' | 'xz' | 'yz', tone = 1, tilt = 0): P3[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 6.283
    const c = Math.cos(a) * r
    const s = Math.sin(a) * r
    const p: [number, number, number] = plane === 'xy' ? [c, s, 0] : plane === 'xz' ? [c, 0, s] : [0, c, s]
    return [p[0], p[1] * Math.cos(tilt) - p[2] * Math.sin(tilt), p[1] * Math.sin(tilt) + p[2] * Math.cos(tilt), tone]
  })
const line = (a: number[], b: number[], n: number, tone = 0): P3[] =>
  Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, tone]
  })

const SHAPES: Record<string, () => P3[]> = {
  // Basketball: a ball with its black seams.
  basketball: () => [
    ...sphere(90, 1, 1),
    ...ring(46, 1.02, 'xy', 0),
    ...ring(46, 1.02, 'yz', 0),
    ...ring(30, 1.02, 'xz', 0, 0).map((p): P3 => [p[0], p[1] * 0, p[2], 0]),
    ...ring(34, 1.02, 'xy', 0, 0).map((p): P3 => [p[0] * 0.55 + 0.82, p[1], p[2] * 0.55, 0]),
    ...ring(34, 1.02, 'xy', 0, 0).map((p): P3 => [p[0] * 0.55 - 0.82, p[1], p[2] * 0.55, 0]),
  ],
  // Dice: a cube's edges with pips on three faces.
  dice: () => {
    const c = 0.8
    const v = [-c, c]
    const out: P3[] = []
    for (const a of v) for (const b of v) {
      out.push(...line([-c, a, b], [c, a, b], 10, 0), ...line([a, -c, b], [a, c, b], 10, 0), ...line([a, b, -c], [a, b, c], 10, 0))
    }
    const pip = (x: number, y: number, z: number) => out.push([x, y, z, 1], [x + 0.03, y, z, 1], [x, y + 0.03, z, 1])
    pip(0, 0, c) // one
    pip(c, -0.35, -0.35); pip(c, 0.35, 0.35) // two
    pip(-0.4, c, -0.4); pip(0, c, 0); pip(0.4, c, 0.4) // three
    return out
  },
  // Planet with a ring.
  saturn: () => [...sphere(80, 0.7, 0), ...ring(70, 1.25, 'xz', 1, 0.45), ...ring(50, 1.0, 'xz', 1, 0.45)],
  // Guitar pick.
  pick: () => {
    const out: P3[] = []
    for (let i = 0; i < 110; i++) {
      const a = (i / 110) * 6.283
      const r = 1 - 0.28 * Math.pow(Math.max(0, -Math.sin(a)), 1.2) * 0 // rounded triangle
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      const k = 1 + 0.35 * Math.cos(a * 3 + 1.57)
      out.push([x * k, y * k * 1.15, 0, i % 7 === 0 ? 1 : 0])
    }
    for (let i = 0; i < 40; i++) out.push([R() * 0.8 - 0.4, R() * 0.8 - 0.3, 0.02, 1])
    return out
  },
  // Paper plane.
  plane: () => [
    ...line([-1, 0.1, 0], [1.1, 0, 0], 26, 0),
    ...line([-1, 0.1, 0], [0.6, -0.1, 0.7], 20, 1),
    ...line([-1, 0.1, 0], [0.6, -0.1, -0.7], 20, 1),
    ...line([1.1, 0, 0], [0.6, -0.1, 0.7], 18, 0),
    ...line([1.1, 0, 0], [0.6, -0.1, -0.7], 18, 0),
    ...line([0.6, -0.1, 0.7], [0.6, -0.1, -0.7], 14, 1),
  ],
  // A piece of bamboo: a hollow stalk with nodes.
  bamboo: () => {
    const out: P3[] = []
    for (let k = 0; k < 3; k++) {
      const y0 = -1.2 + k * 0.85
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * 6.283
        for (let j = 0; j < 3; j++) out.push([Math.cos(a) * 0.32, y0 + j * 0.3, Math.sin(a) * 0.32, 0])
      }
      out.push(...ring(26, 0.38, 'xz', 1, 0).map((p): P3 => [p[0], p[1] + y0 + 0.85, p[2], 1]))
    }
    return out
  },
  // Headphones.
  headphones: () => {
    const out: P3[] = []
    for (let i = 0; i <= 50; i++) {
      const a = (i / 50) * Math.PI
      out.push([Math.cos(a) * 1, Math.sin(a) * 1, 0, 0])
    }
    for (const sx of [-1, 1]) for (let i = 0; i < 40; i++) {
      const a = (i / 40) * 6.283
      out.push([sx * 1, Math.cos(a) * 0.34 - 0.1, Math.sin(a) * 0.34, 1], [sx * 0.88, Math.cos(a) * 0.3 - 0.1, Math.sin(a) * 0.3, 1])
    }
    return out
  },
}

const NAMES = Object.keys(SHAPES)

type Item = { name: string; pts: P3[]; z: number; x: number; wy: number; ax: number; ay: number; va: number; vb: number; ph: number }

export default function Objects() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const phone = window.matchMedia('(max-width: 760px)').matches
    let w = 0
    let h = 0
    let dpr = 1
    let items: Item[] = []
    const build = () => {
      const count = phone ? 2 : 3
      items = Array.from({ length: count }, (_, i) => {
        const name = NAMES[i % NAMES.length]
        // Spread the depth: a few far, a few near.
        const z = 0.15 + ((i * 0.37) % 1) * 0.6
        const side = i % 2 ? 1 : 0
        const edge = phone ? 0.06 : 0.07
        const fx = side ? 1 - R() * edge : R() * edge
        return {
          name,
          pts: SHAPES[name](),
          z,
          x: fx * w,
          wy: (i / count) * (h + 240) + R() * 80,
          ax: R() * 6.283,
          ay: R() * 6.283,
          va: (R() - 0.5) * 0.5,
          vb: 0.15 + R() * 0.3,
          ph: R() * 6.283,
        }
      })
      items.sort((a, b) => a.z - b.z)
    }
    const resize = () => {
      dpr = Math.min(phone ? 1.5 : 2, window.devicePixelRatio || 1)
      w = innerWidth
      h = innerHeight
      cv.width = w * dpr
      cv.height = h * dpr
      build()
    }
    resize()
    window.addEventListener('resize', resize)
    let hot = '#ff7a3d'
    let ink = '#ffffff'
    let sm = { x: 0, y: 0 }
    let raf = 0
    let last = performance.now()
    let frame = 0
    const wrap = () => h + 260
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (document.hidden) {
        last = now
        return
      }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (frame++ % 30 === 0) {
        const cs = getComputedStyle(document.documentElement)
        hot = cs.getPropertyValue('--hot').trim() || hot
        ink = cs.getPropertyValue('--ink').trim() || ink
      }
      // Pointer on desktop, tilt on a phone: both read as one -1..1 "look" vector, eased.
      const lx = live.tilt.x || (live.pointer.active ? (live.pointer.x / w - 0.5) * 2 : 0)
      const ly = live.tilt.y || (live.pointer.active ? (live.pointer.y / h - 0.5) * 2 : 0)
      sm.x += (lx - sm.x) * Math.min(1, dt * 4)
      sm.y += (ly - sm.y) * Math.min(1, dt * 4)
      const sy0 = window.scrollY
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      // None in the hero; they fade in once the intro is behind you.
      const fade = Math.max(0, Math.min(1, (sy0 - h * 1.1) / (h * 0.8)))
      if (fade <= 0) return
      for (const it of items) {
        it.ax += (it.va + live.scrollVel * 0.002) * dt * 60 * 0.02 * 3
        it.ay += it.vb * dt
        const f = 0.25 + it.z * 0.7
        const W = wrap()
        const sy = ((((it.wy - sy0 * f) % W) + W) % W) - 130
        const sx = it.x - sm.x * 70 * it.z * it.z - Math.sin(now / 2400 + it.ph) * 6 * it.z
        const yy = sy - sm.y * 50 * it.z * it.z + Math.cos(now / 2900 + it.ph) * 5 * it.z
        const rad = (phone ? 6 : 8) + it.z * (phone ? 6 : 10)
        const alpha = (phone ? 0.14 : 0.18) + it.z * 0.16
        const cax = Math.cos(it.ax)
        const sax = Math.sin(it.ax)
        const cay = Math.cos(it.ay)
        const say = Math.sin(it.ay)
        const size = 1 + it.z * 0.5
        for (const p of it.pts) {
          // rotate about x then y
          const y1 = p[1] * cax - p[2] * sax
          const z1 = p[1] * sax + p[2] * cax
          const x2 = p[0] * cay + z1 * say
          const z2 = -p[0] * say + z1 * cay
          const persp = 1 + z2 * 0.12
          const a = alpha * (0.45 + 0.55 * ((z2 + 1.3) / 2.6))
          ctx.globalAlpha = Math.max(0, Math.min(1, a * fade))
          ctx.fillStyle = p[3] ? hot : ink
          ctx.fillRect(sx + x2 * rad * persp, yy + y1 * rad * persp, size, size)
        }
      }
      ctx.globalAlpha = 1
    }
    if (reduced) tick(performance.now())
    else raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[1] h-full w-full" />
}
