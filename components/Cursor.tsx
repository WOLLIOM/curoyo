'use client'

import { useEffect, useRef, useState } from 'react'

// The cursor is a bamboo cane drawn in grains; a panda made of the logo's grains comes and eats it in the panda section. It takes the live theme colour (--cur).

export default function Cursor() {
  const cv = useRef<HTMLCanvasElement>(null)
  const [fine, setFine] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) setFine(true)
  }, [])

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const c = cv.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    document.documentElement.classList.add('custom-cursor')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const fit = () => {
      c.width = innerWidth * dpr
      c.height = innerHeight * dpr
    }
    fit()
    window.addEventListener('resize', fit)

    let tx = -200
    let ty = -200
    let x = -200
    let y = -200
    let open = 0
    let openTarget = 0
    let down = 0
    let raf = 0
    let frame = 0
    let col = '#ff7a3d'
    // Bamboo: the cursor is a cane. In the red panda section a panda walks in and eats it.
    type PState = 'away' | 'chase' | 'eat' | 'chew' | 'drift' | 'leave'
    const panda = { st: 'away' as PState, x: -200, y: 0, dir: 1, t: 0, bites: 0, walk: 0, s0: 0 }
    let cane = 1
    let inkCol = '#ffffff'
    const rnd = (n: number) => (Math.random() - 0.5) * n
    // The logo itself (the spotted red panda), sampled into grains. It comes and eats the cane.
    type PP = { lx: number; ly: number; c: number; s: number; x: number; y: number; d: number; vx: number; vy: number }
    const pandaPts: PP[] = []
    const img = new Image()
    img.src = '/logo-panda.png'
    img.onload = () => {
      // The logo is white on black: the white is the animal, the black spots are holes in it.
      const N = 400
      const oc = document.createElement('canvas')
      oc.width = N
      oc.height = N
      const o = oc.getContext('2d')
      if (!o) return
      o.drawImage(img, 0, 0, N, N)
      const d = o.getImageData(0, 0, N, N).data
      const pts: [number, number][] = []
      let x0 = N, x1 = 0, y0 = N, y1 = 0
      for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
        if (d[(py * N + px) * 4] > 140) {
          pts.push([px, py])
          x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py)
        }
      }
      const sc = 132 / (x1 - x0)
      for (let i = 0; i < 1300 && pts.length; i++) {
        const [px, py] = pts[(Math.random() * pts.length) | 0]
        pandaPts.push({ lx: (px - (x0 + x1) / 2) * sc, ly: (py - (y0 + y1) / 2) * sc, c: Math.random() < 0.15 ? 0 : 1, s: 1.3 + Math.random() * 0.7, x: -9999, y: -9999, d: 0, vx: 0, vy: 0 })
      }
    }
    const cane_pts: { t: number; o: number; s: number; n: boolean }[] = []
    for (let i = 0; i < 110; i++) cane_pts.push({ t: i / 110, o: rnd(6), s: 1.5 + Math.random() * 0.9, n: false })
    for (let k2 = 1; k2 * 15 < 46; k2++) for (let j = 0; j < 7; j++) cane_pts.push({ t: (k2 * 15) / 46, o: -4 + j * 1.35, s: 1.9, n: true })
    let cool = 2
    let inSection = false
    const darkEl = document.getElementById('form')
    let dark = false
    let glow = 0
    const motes = Array.from({ length: 220 }, () => ({ a: Math.random() * 6.283, r: Math.sqrt(Math.random()), va: (Math.random() - 0.5) * 0.5, ph: Math.random() * 6.283, s: 1.4 + Math.random() * 1.6 }))
    const crumbs: { x: number; y: number; vx: number; vy: number; life: number }[] = []
    let last = performance.now()
    const pandaEl = document.getElementById('panda')

    const onMove = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      const t = e.target instanceof Element ? e.target.closest('[data-hover],a,button,input,textarea,canvas') : null
      openTarget = t ? 1 : 0
    }
    const onDown = () => (down = 1)
    const onUp = () => (down = 0)

    const tick = () => {
      if (frame % 15 === 0) inkCol = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || inkCol
      if (frame++ % 15 === 0) col = getComputedStyle(document.documentElement).getPropertyValue('--cur').trim() || col
      x += (tx - x) * 0.6
      y += (ty - y) * 0.6
      open += (openTarget - open) * 0.18
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      ctx.fillStyle = col
      ctx.strokeStyle = col
      const k = 1 + open * 0.35 - down * 0.15

      {
        const now = performance.now()
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        if (frame % 10 === 0 && pandaEl) {
          const r = pandaEl.getBoundingClientRect()
          inSection = r.top < innerHeight * 0.7 && r.bottom > innerHeight * 0.3
        }
        cool -= dt
        if (frame % 10 === 0 && darkEl) {
          const r2 = darkEl.getBoundingClientRect()
          dark = r2.top < innerHeight * 0.8 && r2.bottom > innerHeight * 0.2
        }
        glow += ((dark ? 1 : 0) - glow) * Math.min(1, dt * 3)
        const P = panda
        const hot = col
        if (P.st === 'away') {
          if (inSection && cool <= 0 && pandaPts.length) {
            // Grains drift in from all around and gather into the logo beside the cane.
            P.dir = x > 260 ? 1 : -1
            P.x = x - 84 * P.dir
            P.y = y - 18
            P.st = 'chase'
            P.t = 0
            for (const q of pandaPts) {
              const a = Math.random() * 6.283
              const r = 200 + Math.random() * 360
              q.x = x + Math.cos(a) * r
              q.y = y + Math.sin(a) * r * 0.7
              q.d = Math.random() * 0.8
              q.vx = 0
              q.vy = 0
            }
          }
        } else if (P.st === 'chase') {
          P.x += (x - 84 * P.dir - P.x) * 0.2
          P.y += (y - 18 - P.y) * 0.2
          P.t += dt
          if (P.t > 1.6) {
            P.st = 'eat'
            P.t = 0
            P.bites = 0
          }
        } else if (P.st === 'eat') {
          P.x += (x - 78 * P.dir - P.x) * 0.2
          P.y += (y - 18 - P.y) * 0.2
          P.t += dt
          if (P.t > 0.45) {
            P.t = 0
            P.bites++
            cane = Math.max(0, 1 - P.bites / 3)
            for (let i = 0; i < 10; i++) crumbs.push({ x: x + Math.random() * 14, y: y - Math.random() * 30, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5, life: 1 })
            if (P.bites >= 3) {
              P.st = 'chew'
              P.t = 0
            }
          }
        } else if (P.st === 'chew') {
          P.x += (x - 78 * P.dir - P.x) * 0.2
          P.y += (y - 18 - P.y) * 0.2
          P.t += dt
          if (P.t > 1.1) {
            // Done eating: the grains stay and start morphing with the page, like the site's own particles.
            P.st = 'drift'
            P.t = 0
            P.s0 = window.scrollY
          }
        } else if (P.st === 'drift') {
          P.x += (x + 90 * P.dir - P.x) * 0.05
          P.y += (y - 40 - P.y) * 0.05
          P.t += dt
          const above = pandaEl ? pandaEl.getBoundingClientRect().top > innerHeight * 1.1 : false
          if (window.scrollY < P.s0 - innerHeight * 1.2 || above) {
            P.st = 'leave'
            P.t = 0
          }
        } else {
          // It comes apart into grains again.
          if (P.t === 0) {
            for (const q of pandaPts) {
              const a = Math.random() * 6.283
              const v = 1 + Math.random() * 4
              q.vx = Math.cos(a) * v
              q.vy = Math.sin(a) * v - 1
            }
          }
          P.t += dt
          if (P.t > 0.9) {
            P.st = 'away'
            cool = 6
          }
        }
        if (P.st === 'away' || P.st === 'leave') cane = Math.min(1, cane + dt * 0.5)

        // Everything here is made of the site's grain: small squares in the theme's ink and rust, never solid shapes.
        const ink = inkCol
        const grain = (gx: number, gy: number, sz: number, c: string, a = 1) => {
          ctx.globalAlpha = a
          ctx.fillStyle = c
          ctx.fillRect(gx - sz / 2, gy - sz / 2, sz, sz)
        }

        // In the dark room the cane is a lantern, and its light is made of grains too: motes that thin out with distance.
        if (glow > 0.01) {
          const fl = 0.88 + Math.sin(frame * 0.21) * 0.06 + Math.sin(frame * 0.57) * 0.05
          for (let i = 0; i < motes.length; i++) {
            const m = motes[i]
            m.a += m.va * dt
            const rr = m.r * 250 * fl * (1 + Math.sin(frame * 0.03 + m.ph) * 0.06)
            const mxp = x + Math.cos(m.a) * rr
            const myp = y - 14 + Math.sin(m.a) * rr * 0.85
            const fall = 1 - m.r
            grain(mxp, myp, m.s, i % 5 === 0 ? hot : ink, glow * fall * fall * (0.55 + 0.45 * Math.sin(frame * 0.09 + m.ph)))
          }
          ctx.globalAlpha = 1
        }

        // The cane: a column of grains that shimmer, denser at the nodes. Its end is the hotspot.
        const ca = Math.cos(0.38)
        const sa = Math.sin(0.38)
        for (let i = 0; i < cane_pts.length; i++) {
          const q = cane_pts[i]
          if (q.t > cane) continue
          const L = 46 * q.t * k
          const lx = q.o + Math.sin(frame * 0.12 + i) * 0.7
          const ly = -L + Math.cos(frame * 0.1 + i * 2) * 0.7
          grain(x + lx * ca - ly * sa, y + lx * sa + ly * ca, q.s, q.n ? hot : ink, q.n ? 0.95 : 0.8)
        }
        grain(x, y, 4 * k, hot)

        // Crumbs: grains that fly off with each bite.
        for (let i = crumbs.length - 1; i >= 0; i--) {
          const c2 = crumbs[i]
          c2.x += c2.vx
          c2.y += c2.vy
          c2.vy += 0.15
          c2.life -= 0.022
          if (c2.life <= 0) {
            crumbs.splice(i, 1)
            continue
          }
          grain(c2.x, c2.y, 2.4, ink, c2.life)
        }
        ctx.globalAlpha = 1

        if (P.st !== 'away') {
          // The logo as grains: they gather from all around, hold the shape beside the cane, then scatter again.
          const forming = P.st === 'chase'
          const leaving = P.st === 'leave'
          const lunge = P.st === 'eat' ? Math.max(0, Math.sin((P.t / 0.45) * Math.PI)) * 7 : 0
          const squash = P.st === 'chew' ? 1 - Math.abs(Math.sin(P.t * 9)) * 0.06 : 1
          const fade = leaving ? Math.max(0, 1 - P.t / 0.9) : 1
          for (let i = 0; i < pandaPts.length; i++) {
            const q = pandaPts[i]
            if (P.st === 'drift') {
              // Same shapes the page goes through as you scroll: ring, galaxy, planet, wave.
              const n = pandaPts.length
              const u = i / n
              const R = 80
              const sh = Math.floor(window.scrollY / (innerHeight * 0.8)) % 9
              const tt = P.t
              let sx = 0
              let sy = 0
              const rot = (px: number, py: number, pz: number, ax: number, ay: number) => {
                const y1 = py * Math.cos(ax) - pz * Math.sin(ax)
                const z1 = py * Math.sin(ax) + pz * Math.cos(ax)
                sx = (px * Math.cos(ay) + z1 * Math.sin(ay)) * (1 + z1 * 0.002)
                sy = y1
              }
              if (sh === 0) {
                const a = u * 6.283 + tt * 0.3
                sx = Math.cos(a) * (R + q.d * 14)
                sy = Math.sin(a) * (R + q.d * 14)
              } else if (sh === 1) {
                const a = u * 18.8 + tt * 0.5
                const r = R * 1.5 * Math.sqrt(u)
                sx = Math.cos(a) * r
                sy = Math.sin(a) * r * 0.45
              } else if (sh === 2) {
                const yy = 1 - 2 * u
                const rr = Math.sqrt(1 - yy * yy)
                const th = i * 2.399 + tt * 0.8
                rot(Math.cos(th) * rr * R, yy * R, Math.sin(th) * rr * R, 0.4, tt * 0.8)
              } else if (sh === 3) {
                sx = (u - 0.5) * R * 3.4
                sy = Math.sin(sx * 0.05 + tt * 2) * R * 0.4 + (q.d - 0.4) * 16
              } else if (sh === 4) {
                // torus
                const a = u * 6.283 * 24
                const b2 = i * 0.37
                const rr = R * 0.75 + Math.cos(b2) * R * 0.3
                rot(Math.cos(a) * rr, Math.sin(b2) * R * 0.3, Math.sin(a) * rr, 0.9, tt * 0.7)
              } else if (sh === 5) {
                // DNA double helix
                const yy = (u - 0.5) * R * 2.6
                const a = u * 18 + tt * 1.2 + (i % 2) * Math.PI
                rot(Math.cos(a) * R * 0.5, yy, Math.sin(a) * R * 0.5, 0, 0.3)
              } else if (sh === 6) {
                // cube made of edges
                const e = i % 12
                const f = u * 12 % 1
                const c = R * 0.7
                const ax = e < 4 ? [f * 2 - 1, e & 1 ? 1 : -1, e & 2 ? 1 : -1] : e < 8 ? [e & 1 ? 1 : -1, f * 2 - 1, e & 2 ? 1 : -1] : [e & 1 ? 1 : -1, e & 2 ? 1 : -1, f * 2 - 1]
                rot(ax[0] * c, ax[1] * c, ax[2] * c, tt * 0.6, tt * 0.9)
              } else if (sh === 7) {
                // heart
                const a = u * 6.283
                const r = 0.4 + (q.d - 0.4) * 0.15
                sx = 16 * Math.pow(Math.sin(a), 3) * R * 0.065 * (1 + r * 0.1)
                sy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * R * 0.065
                const k3 = 1 + Math.sin(tt * 3) * 0.04
                sx *= k3
                sy *= k3
              } else {
                // cone / tornado
                const yy = (u - 0.5) * R * 2.4
                const a = u * 40 + tt * 1.5
                const rr = (u * R) * 0.9
                rot(Math.cos(a) * rr, -yy, Math.sin(a) * rr, 0.2, 0)
              }
              q.x += (P.x + sx - q.x) * 0.06
              q.y += (P.y + sy - q.y) * 0.06
            } else if (leaving) {
              q.x += q.vx
              q.y += q.vy
              q.vx *= 0.97
              q.vy *= 0.97
            } else if (!forming || P.t > q.d) {
              const tx2 = P.x + (q.lx + lunge) * P.dir
              const ty2 = P.y + q.ly * squash
              const rate = forming ? 0.1 : 0.25
              q.x += (tx2 - q.x) * rate
              q.y += (ty2 - q.y) * rate
            }
            const al = forming ? Math.min(1, 0.25 + P.t * 0.8) : fade
            grain(q.x + Math.sin(frame * 0.2 + i) * 0.4, q.y + Math.cos(frame * 0.17 + i) * 0.4, q.s, q.c === 0 ? hot : ink, 0.95 * al)
          }
          ctx.globalAlpha = 1
        }
      }
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('resize', fit)
      document.documentElement.classList.remove('custom-cursor')
    }
  }, [])

  return (
    <canvas ref={cv} aria-hidden data-fine={fine} className="pointer-events-none fixed inset-0 z-[60]" style={{ width: '100vw', height: '100vh' }} />
  )
}
