'use client'

import { useEffect, useRef } from 'react'
import { live } from '@/lib/store'

// Life around the trees: birds crossing the sky, butterflies, drifting leaves, pollen. Drawn only while the Eden room is on screen.
const ROOM = 1
const rand = (a: number, b: number) => a + Math.random() * (b - a)

interface Bird { x: number; y: number; v: number; s: number; ph: number; dir: number }
interface Fly { x: number; y: number; ph: number; s: number; hue: number; cx: number; cy: number }
interface Leaf { x: number; y: number; ph: number; s: number; r: number }
interface Dust { x: number; y: number; ph: number; s: number }

export default function EdenLife() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0
    let H = 0
    let dpr = 1
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = window.innerWidth
      H = window.innerHeight
      cv.width = W * dpr
      cv.height = H * dpr
      cv.style.width = `${W}px`
      cv.style.height = `${H}px`
    }
    resize()
    window.addEventListener('resize', resize)

    const mkBird = (): Bird => {
      const dir = Math.random() < 0.5 ? 1 : -1
      return { x: dir > 0 ? rand(-0.4, 0) * W : W + rand(0, 0.4) * W, y: rand(0.08, 0.34) * H, v: rand(55, 95) * dir, s: rand(0.8, 1.5), ph: rand(0, 6), dir }
    }
    const birds: Bird[] = Array.from({ length: 6 }, () => ({ ...mkBird(), x: rand(0, W) }))
    const flies: Fly[] = Array.from({ length: 7 }, () => {
      const cx = rand(0.15, 0.85) * W
      const cy = rand(0.25, 0.5) * H
      return { x: cx, y: cy, cx, cy, ph: rand(0, 6), s: rand(0.8, 1.3), hue: Math.random() }
    })
    const leaves: Leaf[] = Array.from({ length: 16 }, () => ({ x: rand(0, W), y: rand(0, H), ph: rand(0, 6), s: rand(0.6, 1.3), r: rand(0, 6) }))
    const dust: Dust[] = Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(0.2, 0.9) * H, ph: rand(0, 6), s: rand(0.6, 1.6) }))

    let raf = 0
    let last = performance.now()
    let t = 0
    let drawn = true
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      // Visible only while the trees are: fade in and out with the scroll.
      const a = Math.max(0, 1 - Math.abs(live.section - ROOM) * 1.7)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Off-section: clear once, then skip the full-screen clear every frame.
      if (a > 0.01 || drawn) ctx.clearRect(0, 0, W, H)
      drawn = a > 0.01
      if (a > 0.01) {
        const ink = live.theme.particle
        const acc = live.theme.accent
        ctx.globalAlpha = a
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Pollen
        ctx.fillStyle = acc
        for (const d of dust) {
          d.x += Math.sin(t * 0.4 + d.ph) * 6 * dt
          d.y -= 5 * d.s * dt
          if (d.y < 0) d.y = H
          ctx.globalAlpha = a * (0.25 + 0.35 * Math.sin(t * 1.3 + d.ph))
          ctx.beginPath()
          ctx.arc(d.x, d.y, 1.4 * d.s, 0, 6.3)
          ctx.fill()
        }
        ctx.globalAlpha = a

        // Leaves
        ctx.fillStyle = acc
        for (const l of leaves) {
          l.y += (22 + 14 * l.s) * dt
          l.x += Math.sin(t * 0.8 + l.ph) * 26 * dt + 8 * dt
          l.r += dt * (1 + l.s)
          if (l.y > H + 20) {
            l.y = -20
            l.x = rand(0, W)
          }
          ctx.save()
          ctx.translate(l.x, l.y)
          ctx.rotate(l.r)
          ctx.scale(1, Math.abs(Math.cos(l.r * 0.7)) * 0.7 + 0.3)
          ctx.globalAlpha = a * 0.7
          ctx.beginPath()
          ctx.ellipse(0, 0, 9 * l.s, 4.5 * l.s, 0, 0, 6.3)
          ctx.fill()
          ctx.restore()
        }
        ctx.globalAlpha = a

        // Butterflies: two wings that open and close, wandering in a loop around a perch.
        for (const f of flies) {
          f.ph += dt * 1.1
          f.x = f.cx + Math.cos(f.ph * 0.9) * 90 + Math.sin(f.ph * 2.3) * 22
          f.y = f.cy + Math.sin(f.ph * 1.3) * 50 + Math.cos(f.ph * 3.1) * 12
          const flap = Math.abs(Math.sin(t * 9 + f.ph * 4))
          ctx.save()
          ctx.translate(f.x, f.y)
          ctx.rotate(Math.cos(f.ph * 0.9) * 0.4)
          ctx.fillStyle = f.hue > 0.5 ? acc : ink
          for (const side of [-1, 1]) {
            ctx.beginPath()
            ctx.ellipse(side * 6 * f.s * (0.25 + 0.75 * flap), -2 * f.s, 6.5 * f.s * (0.25 + 0.75 * flap), 7 * f.s, side * 0.4, 0, 6.3)
            ctx.fill()
            ctx.beginPath()
            ctx.ellipse(side * 4.5 * f.s * (0.25 + 0.75 * flap), 5 * f.s, 4 * f.s * (0.25 + 0.75 * flap), 5 * f.s, -side * 0.3, 0, 6.3)
            ctx.fill()
          }
          ctx.restore()
        }

        // Birds: a simple bent line for each wing, flapping.
        ctx.strokeStyle = ink
        for (const b of birds) {
          b.x += b.v * dt
          b.ph += dt * (7 + b.s * 2)
          if ((b.dir > 0 && b.x > W + 60) || (b.dir < 0 && b.x < -60)) Object.assign(b, mkBird())
          const wing = Math.sin(b.ph)
          const bob = Math.sin(b.ph * 0.5) * 3
          ctx.save()
          ctx.translate(b.x, b.y + bob + Math.sin(b.x * 0.01) * 18)
          ctx.scale(b.s * b.dir, b.s)
          ctx.lineWidth = 2.6
          ctx.beginPath()
          ctx.moveTo(-16, -wing * 11)
          ctx.quadraticCurveTo(-7, -wing * 12 - 5, 0, 0)
          ctx.quadraticCurveTo(7, -wing * 12 - 5, 16, -wing * 11)
          ctx.stroke()
          ctx.restore()
        }
        ctx.globalAlpha = 1
      }
      raf = requestAnimationFrame(tick)
    }
    if (!reduced) raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[2]" />
}
