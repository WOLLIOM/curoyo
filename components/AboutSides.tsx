'use client'

import { useEffect, useRef, useState } from 'react'
import CertObject, { type ObjKind } from './CertObject'

// Either side of the portrait, on wide screens: what is going on in there. Code on the left, music on the right.
const CODE = [
  'const idea = await dream()',
  'const world = build(idea)',
  'world.particles.forEach(p =>',
  '  p.follow(visitor.hand))',
  'if (stuck) { breathe(); retry() }',
  'ship(world, { fast: "suddenly" })',
]

function Code() {
  const [text, setText] = useState('')
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let seen = false
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting))
    if (box.current) io.observe(box.current)
    let line = 0
    let ch = 0
    let out = ''
    const id = window.setInterval(() => {
      if (!seen) return
      const src = CODE[line]
      if (!src) return // waiting for the restart timer
      if (ch <= src.length) {
        ch++
        setText(out + src.slice(0, ch))
      } else {
        out += src + '\n'
        line++
        ch = 0
        if (line >= CODE.length) {
          window.setTimeout(() => {
            line = 0
            out = ''
            setText('')
          }, 1400)
          line = CODE.length + 1
        }
      }
    }, 55)
    return () => {
      window.clearInterval(id)
      io.disconnect()
    }
  }, [])
  return (
    <div ref={box} className="w-[300px] rounded-[18px] p-5 text-left" style={{ boxShadow: 'inset 0 0 0 1.5px var(--line)', background: 'color-mix(in srgb, var(--bg) 70%, transparent)' }}>
      <p className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--hot)' }}>In my head · code</p>
      <pre className="mt-3 h-[150px] overflow-hidden whitespace-pre-wrap font-mono text-[13px] font-semibold leading-[1.55]" style={{ color: 'var(--ink)' }}>
        {text}
        <span style={{ color: 'var(--hot)' }}>▍</span>
      </pre>
    </div>
  )
}

function Strings() {
  const paths = useRef<(SVGPathElement | null)[]>([])
  const box = useRef<SVGSVGElement>(null)
  useEffect(() => {
    let raf = 0
    let seen = false
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting))
    if (box.current) io.observe(box.current)
    const t0 = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (!seen) return
      const t = (now - t0) / 1000
      paths.current.forEach((p, i) => {
        if (!p) return
        // Every few seconds a different string is plucked and rings out.
        const pluck = Math.max(0, 1 - ((t * 0.7 + i * 0.37) % 2.6) / 1.4)
        const amp = 2 + pluck * 11
        const f = 5 + i * 0.7
        let d = 'M0 20'
        for (let x = 0; x <= 280; x += 8) d += ` L${x} ${20 + Math.sin((x / 280) * Math.PI) * Math.sin(t * f * 3 + i) * amp}`
        p.setAttribute('d', d)
      })
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [])
  return (
    <div className="w-[300px] rounded-[18px] p-5 text-left" style={{ boxShadow: 'inset 0 0 0 1.5px var(--line)', background: 'color-mix(in srgb, var(--bg) 70%, transparent)' }}>
      <p className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--hot)' }}>In my head · music</p>
      <svg ref={box} viewBox="0 0 280 270" className="mt-3 h-[150px] w-full" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i} transform={`translate(0 ${i * 40 - 20})`}>
            <path ref={(el) => { paths.current[i] = el }} fill="none" stroke={i % 2 ? 'var(--hot)' : 'var(--ink)'} strokeWidth={1 + (5 - i) * 0.25} strokeLinecap="round" />
          </g>
        ))}
      </svg>
      <p className="mt-2 text-[13px] font-bold" style={{ color: 'var(--muted)' }}>Em · G · D · A. Seven years on stage.</p>
    </div>
  )
}

function Tag({ kind, label, line }: { kind: ObjKind; label: string; line: string }) {
  return (
    <div className="flex w-[300px] items-center gap-4 text-left">
      <CertObject kind={kind} size={110} />
      <div>
        <p className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--hot)' }}>{label}</p>
        <p className="mt-1 text-[14px] font-bold leading-snug" style={{ color: 'var(--muted)' }}>{line}</p>
      </div>
    </div>
  )
}

// Grains floating at three depths either side of the portrait: far ones small and still, near ones large and quick,
// and each layer drifts differently with the pointer and the scroll, so the section reads as a space with depth.
function DepthField() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let dpr = 1
    const LAYERS = [
      { n: 110, size: 1.8, a: 0.4, v: 5, par: 0.015, sc: 0.04 },
      { n: 70, size: 3, a: 0.6, v: 12, par: 0.04, sc: 0.12 },
    ]
    type G = { x: number; y: number; ph: number; hot: boolean; l: number }
    let gs: G[] = []
    const spawnX = () => {
      // Keep the middle clear for the portrait: grains live in the outer ~32% each side.
      const side = Math.random() < 0.5 ? 0 : 1
      const e = Math.random() * 0.34
      return (side ? 1 - e : e) * w
    }
    const resize = () => {
      const r = cv.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = r.width
      h = r.height
      cv.width = w * dpr
      cv.height = h * dpr
      gs = []
      LAYERS.forEach((L, l) => {
        for (let i = 0; i < L.n; i++) gs.push({ x: spawnX(), y: Math.random() * h, ph: Math.random() * 6.283, hot: Math.random() < 0.28, l })
      })
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    let mx = 0
    let my = 0
    const onMove = (e: PointerEvent) => {
      mx = e.clientX / innerWidth - 0.5
      my = e.clientY / innerHeight - 0.5
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    let hot = '#ff7a3d'
    let ink = '#ffffff'
    let raf = 0
    let last = performance.now()
    let frame = 0
    let seen = false
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting))
    io.observe(cv)
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!seen && !reduced) {
        raf = requestAnimationFrame(tick)
        return
      }
      if (frame++ % 20 === 0) {
        const cs = getComputedStyle(document.documentElement)
        hot = cs.getPropertyValue('--hot').trim() || hot
        ink = cs.getPropertyValue('--ink').trim() || ink
      }
      const top = cv.getBoundingClientRect().top
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      for (const g of gs) {
        const L = LAYERS[g.l]
        g.y -= L.v * dt
        if (g.y < -10) {
          g.y = h + 10
          g.x = spawnX()
        }
        const sx = g.x + Math.sin(now / 1800 + g.ph) * (6 + g.l * 6) - mx * innerWidth * L.par
        const sy = ((g.y + top * L.sc * -1 - my * innerHeight * L.par) % (h + 20) + h + 20) % (h + 20) - 10
        const tw = 0.7 + 0.3 * Math.sin(now / 700 + g.ph)
        ctx.globalAlpha = L.a * tw
        ctx.fillStyle = g.hot ? hot : ink
        ctx.fillRect(sx - L.size / 2, sy - L.size / 2, L.size, L.size)
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }
    if (reduced) tick(performance.now())
    else raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-0 h-full w-full" />
}

export default function AboutSides() {
  return (
    <>
    <DepthField />
    <div className="pointer-events-none absolute inset-x-0 top-[14svh] hidden justify-between px-[4vw] lg:flex" aria-hidden>
      <div className="mt-[6svh] flex flex-col gap-10">
        <Code />
        <Tag kind="brain" label="Wired for" line="Odd ideas first, rules after." />
      </div>
      <div className="mt-[18svh] flex flex-col gap-10">
        <Strings />
        <Tag kind="guitar" label="Off the clock" line="Stage lights, loud amps, repeat." />
      </div>
    </div>
    </>
  )
}
