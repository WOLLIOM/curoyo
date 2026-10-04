'use client'

import { useEffect, useRef, type CSSProperties } from 'react'

// A line that is dark until you shine the cursor on it. On touch screens a light wanders along it by itself.
export default function Torch({ text, className = '', radius = 190, dim = 0.13, lit = 'var(--hot)' }: { text: string; className?: string; radius?: number; dim?: number; lit?: string }) {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = el.current
    if (!node) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let mx = -999
    let my = -999
    let seen = false
    let visible = false
    let raf = 0
    const onMove = (e: PointerEvent) => {
      mx = e.clientX
      my = e.clientY
      seen = true
    }
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(node)
    window.addEventListener('pointermove', onMove, { passive: true })
    const t0 = performance.now()
    const tick = (now: number) => {
      if (visible) {
        const r = node.getBoundingClientRect()
        let x = mx - r.left
        let y = my - r.top
        if (!seen || reduced) {
          const t = (now - t0) / 1000
          x = r.width * (0.5 + 0.45 * Math.sin(t * 0.55))
          y = r.height * (0.5 + 0.4 * Math.sin(t * 0.9 + 1))
        }
        node.style.setProperty('--tx', `${x}px`)
        node.style.setProperty('--ty', `${y}px`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  // The light is grainy like the rest of the site: a tight solid core, and a wider halo that only shows speckles.
  const core = `radial-gradient(circle ${radius * 0.55}px at var(--tx, 50%) var(--ty, 50%), #000 0%, #000 55%, transparent 100%)`
  const halo = `radial-gradient(circle ${radius * 1.15}px at var(--tx, 50%) var(--ty, 50%), #000 0%, #000 25%, transparent 100%)`
  const speckle = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' seed='4'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 9 -4.4'/></filter><rect width='220' height='220' filter='url(%23n)'/></svg>")`
  const haloStyle = {
    color: lit,
    WebkitMaskImage: `${halo}, ${speckle}`,
    maskImage: `${halo}, ${speckle}`,
    WebkitMaskComposite: 'source-in',
    maskComposite: 'intersect',
  } as CSSProperties
  return (
    <div ref={el} className={`relative ${className}`}>
      <p className="font-display" style={{ opacity: dim }}>{text}</p>
      <p aria-hidden className="absolute inset-0 font-display" style={haloStyle}>{text}</p>
      <p aria-hidden className="absolute inset-0 font-display" style={{ color: lit, WebkitMaskImage: core, maskImage: core }}>{text}</p>
    </div>
  )
}
