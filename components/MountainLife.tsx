'use client'

import { useEffect, useRef } from 'react'
import { live } from '@/lib/store'

// The summit at night: stars, an aurora, drifting snow, ice glints, shooting stars and a slow eagle.
const ROOM = 13
const rand = (a: number, b: number) => a + Math.random() * (b - a)

export default function MountainLife() {
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

    const stars = Array.from({ length: 140 }, () => ({ x: rand(0, 1), y: rand(0, 0.6), r: rand(0.4, 1.6), ph: rand(0, 6), sp: rand(0.6, 2.2) }))
    const snow = Array.from({ length: 90 }, () => ({ x: rand(0, 1), y: rand(0, 1), r: rand(0.8, 2.4), ph: rand(0, 6), v: rand(14, 44) }))
    const glints = Array.from({ length: 14 }, () => ({ x: rand(0.1, 0.9), y: rand(0.45, 0.85), ph: rand(0, 6), sp: rand(0.8, 1.8) }))
    let shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null
    let nextShoot = 2
    let eagle = { x: -0.1, y: 0.3, ph: 0 }

    let raf = 0
    let last = performance.now()
    let t = 0
    let drawn = true
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      const a = Math.max(0, Math.min(1, (live.section - (ROOM - 0.9)) * 1.4))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Off-section: clear once, then skip the full-screen clear every frame.
      if (a > 0.01 || drawn) ctx.clearRect(0, 0, W, H)
      drawn = a > 0.01
      if (a > 0.01) {
        // Aurora: slow translucent ribbons.
        for (let k = 0; k < 3; k++) {
          const g = ctx.createLinearGradient(0, H * 0.05, 0, H * 0.5)
          g.addColorStop(0, 'rgba(94,224,255,0)')
          g.addColorStop(0.5, k === 1 ? 'rgba(140,120,255,0.16)' : 'rgba(94,224,255,0.14)')
          g.addColorStop(1, 'rgba(94,224,255,0)')
          ctx.fillStyle = g
          ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 0.4 + k))
          ctx.beginPath()
          ctx.moveTo(0, H * 0.5)
          for (let x = 0; x <= W; x += 24) {
            ctx.lineTo(x, H * (0.2 + k * 0.05) + Math.sin(x * 0.006 + t * 0.35 + k * 2) * H * 0.07)
          }
          ctx.lineTo(W, H * 0.55)
          ctx.closePath()
          ctx.fill()
        }

        // Stars
        ctx.fillStyle = '#ffffff'
        for (const s of stars) {
          ctx.globalAlpha = a * (0.35 + 0.65 * Math.abs(Math.sin(t * s.sp + s.ph)))
          ctx.beginPath()
          ctx.arc(s.x * W, s.y * H, s.r, 0, 6.3)
          ctx.fill()
        }

        // Shooting star
        nextShoot -= dt
        if (nextShoot < 0 && !shoot) {
          shoot = { x: rand(0.2, 0.9) * W, y: rand(0.05, 0.25) * H, vx: -rand(500, 800), vy: rand(220, 360), life: 0 }
          nextShoot = rand(3, 7)
        }
        if (shoot) {
          shoot.life += dt
          shoot.x += shoot.vx * dt
          shoot.y += shoot.vy * dt
          const f = 1 - shoot.life / 0.9
          if (f <= 0) shoot = null
          else {
            ctx.globalAlpha = a * f
            ctx.strokeStyle = '#dff3ff'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(shoot.x, shoot.y)
            ctx.lineTo(shoot.x - shoot.vx * 0.09, shoot.y - shoot.vy * 0.09)
            ctx.stroke()
          }
        }

        // Ice glints on the peaks
        ctx.strokeStyle = '#bff0ff'
        ctx.lineWidth = 1.5
        for (const g of glints) {
          const f = Math.max(0, Math.sin(t * g.sp + g.ph)) ** 6
          if (f < 0.05) continue
          ctx.globalAlpha = a * f
          const x = g.x * W
          const y = g.y * H
          ctx.beginPath()
          ctx.moveTo(x - 9 * f, y)
          ctx.lineTo(x + 9 * f, y)
          ctx.moveTo(x, y - 9 * f)
          ctx.lineTo(x, y + 9 * f)
          ctx.stroke()
        }

        // Snow
        ctx.fillStyle = '#eaf6ff'
        ctx.globalAlpha = a * 0.75
        for (const s of snow) {
          s.y += (s.v * dt) / H
          s.x += (Math.sin(t * 0.7 + s.ph) * 10 * dt) / W
          if (s.y > 1) s.y = 0
          ctx.beginPath()
          ctx.arc(s.x * W, s.y * H, s.r, 0, 6.3)
          ctx.fill()
        }

        // An eagle gliding across, wings barely moving.
        eagle.x += dt * 0.035
        eagle.ph += dt * 1.6
        if (eagle.x > 1.1) eagle = { x: -0.1, y: rand(0.2, 0.4), ph: 0 }
        const ex = eagle.x * W
        const ey = eagle.y * H + Math.sin(eagle.ph * 0.6) * 10
        const w = Math.sin(eagle.ph) * 4
        ctx.globalAlpha = a * 0.9
        ctx.strokeStyle = '#cfe3ff'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(ex - 34, ey - w)
        ctx.quadraticCurveTo(ex - 14, ey - 12 - w, ex, ey)
        ctx.quadraticCurveTo(ex + 14, ey - 12 - w, ex + 34, ey - w)
        ctx.stroke()
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
