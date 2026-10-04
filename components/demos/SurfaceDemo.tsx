'use client'

import { useEffect, useRef, useState } from 'react'
import { live, useStore } from '@/lib/store'
import { enableMotion, motionSupported } from '@/lib/motion'

// A surface of the logo's spots. Your finger or cursor pushes them aside; tilt the phone and they slide like sand.

interface Bean {
  hx: number
  hy: number
  x: number
  y: number
  vx: number
  vy: number
  a: number
  s: number
}

export default function SurfaceDemo() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [canTilt, setCanTilt] = useState(false)
  const gyroOn = useStore((s) => s.gyroOn)

  useEffect(() => setCanTilt(motionSupported()), [])

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    let beans: Bean[] = []
    let w = 0
    let h = 0
    let raf = 0
    let visible = false
    const pointer = { x: -999, y: -999, on: false }

    const layout = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = c.clientWidth
      h = c.clientHeight
      c.width = w * dpr
      c.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      beans = []
      const gap = Math.max(22, Math.min(w, h) / 11)
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = gap / 2; x < w; x += gap) {
          const jx = x + (Math.random() - 0.5) * gap * 0.3
          const jy = y + (Math.random() - 0.5) * gap * 0.3
          beans.push({ hx: jx, hy: jy, x: jx, y: jy, vx: 0, vy: 0, a: Math.random() * Math.PI, s: gap * (0.2 + Math.random() * 0.1) })
        }
      }
    }

    const toLocal = (e: PointerEvent) => {
      const r = c.getBoundingClientRect()
      pointer.x = e.clientX - r.left
      pointer.y = e.clientY - r.top
      pointer.on = true
    }
    const leave = () => (pointer.on = false)
    c.addEventListener('pointermove', toLocal)
    c.addEventListener('pointerdown', toLocal)
    c.addEventListener('pointerleave', leave)
    c.addEventListener('pointerup', (e) => e.pointerType !== 'mouse' && leave())

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(tick)
      }
    })
    io.observe(c)

    function tick() {
      if (!visible || !ctx) return
      const th = live.theme
      ctx.clearRect(0, 0, w, h)
      const gx = live.tilt.x * 900
      const gy = live.tilt.y * 900
      const R = Math.min(w, h) * 0.22
      for (const b of beans) {
        let ax = (b.hx - b.x) * 30 + gx * 0.1
        let ay = (b.hy - b.y) * 30 + gy * 0.1
        if (pointer.on) {
          const dx = b.x - pointer.x
          const dy = b.y - pointer.y
          const d = Math.hypot(dx, dy)
          if (d < R && d > 0.01) {
            const f = (1 - d / R) * 2600
            ax += (dx / d) * f
            ay += (dy / d) * f
          }
        }
        b.vx = (b.vx + ax / 60) * 0.86
        b.vy = (b.vy + ay / 60) * 0.86
        b.x += b.vx / 60
        b.y += b.vy / 60
        const disp = Math.min(1, Math.hypot(b.x - b.hx, b.y - b.hy) / 40)
        ctx.save()
        ctx.translate(b.x, b.y)
        ctx.rotate(b.a + disp * 1.4)
        ctx.globalAlpha = 0.35 + disp * 0.65
        ctx.fillStyle = disp > 0.35 && th.accentAmt > 0 ? th.accent : th.particle
        ctx.beginPath()
        ctx.ellipse(0, 0, b.s * (1 + disp * 0.5), b.s * 0.58, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      raf = requestAnimationFrame(tick)
    }

    layout()
    window.addEventListener('resize', layout)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', layout)
      c.removeEventListener('pointermove', toLocal)
      c.removeEventListener('pointerdown', toLocal)
      c.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <div className="relative h-full">
      <canvas ref={canvas} data-hover="Touch" className="h-full w-full touch-pan-y" />
      {canTilt && !gyroOn && (
        <button
          onClick={() => enableMotion()}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-[13px] font-bold"
          style={{ background: 'var(--ink)', color: 'var(--bg)' }}
        >
          Tilt your phone
        </button>
      )}
    </div>
  )
}
