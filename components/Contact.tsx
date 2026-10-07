'use client'

import { useEffect, useRef, useState } from 'react'
import { live } from '@/lib/store'
import { haptic } from '@/lib/phone'
import { hashText, sound } from '@/lib/sound'
import { PHONE, PHONE_HREF } from '@/lib/site'

const KINDS = ['A website', '3D visuals', 'A product in 3D', 'A game', 'Architecture', 'Something strange']
const RING = 'SAY HELLO · START A PROJECT · IDEAS BUILT IN 3D · PACALIX · '

// Letters lean away from the cursor and blush red as it passes, like fur brushed the wrong way.
function MagneticLine({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const letters = Array.from(root.querySelectorAll<HTMLElement>('[data-l]'))
    let raf = 0
    const state = letters.map(() => ({ x: 0, y: 0, r: 0, h: 0 }))
    const tick = () => {
      const px = live.pointer.x
      const py = live.pointer.y
      letters.forEach((el, i) => {
        const b = el.getBoundingClientRect()
        const cx = b.left + b.width / 2
        const cy = b.top + b.height / 2
        const dx = cx - px
        const dy = cy - py
        const d = Math.hypot(dx, dy)
        const f = live.pointer.active ? Math.max(0, 1 - d / 160) : 0
        const s = state[i]
        const tx = (dx / (d + 1)) * f * 18
        const ty = (dy / (d + 1)) * f * 18 - f * 10
        s.x += (tx - s.x) * 0.18
        s.y += (ty - s.y) * 0.18
        s.r += (f * (dx > 0 ? 12 : -12) - s.r) * 0.18
        s.h += (f - s.h) * 0.12
        el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) rotate(${s.r.toFixed(1)}deg)`
        el.style.color = s.h > 0.05 ? `color-mix(in srgb, var(--hot) ${Math.min(100, s.h * 160).toFixed(0)}%, var(--ink))` : ''
      })
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf)
      if (e.isIntersecting) raf = requestAnimationFrame(tick)
    })
    io.observe(root)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [text])
  return (
    <span ref={ref} className={className} aria-label={text}>
      {text.split(' ').map((w, wi) => (
        <span key={wi} aria-hidden className="inline-block whitespace-nowrap">
          {w.split('').map((ch, i) => (
            <span key={i} data-l className="inline-block will-change-transform">
              {ch}
            </span>
          ))}
          {' '}
        </span>
      ))}
    </span>
  )
}

// Paw prints follow the cursor across the contact section, left and right in turn, and fade.
function Paws() {
  const layer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = layer.current
    const host = root?.parentElement
    if (!root || !host) return
    let lx = 0
    let ly = 0
    let side = 1
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      if (e.clientY < r.top || e.clientY > r.bottom) return
      const d = Math.hypot(e.clientX - lx, e.clientY - ly)
      if (d < 70) return
      const ang = Math.atan2(e.clientY - ly, e.clientX - lx)
      lx = e.clientX
      ly = e.clientY
      if (root.childElementCount > 14) root.firstElementChild?.remove()
      side = -side
      const px = e.clientX + Math.cos(ang + Math.PI / 2) * 9 * side
      const py = e.clientY + Math.sin(ang + Math.PI / 2) * 9 * side
      const p = document.createElement('span')
      p.className = 'paw'
      p.style.left = `${px}px`
      p.style.top = `${py}px`
      p.style.setProperty('--rot', `${(ang * 180) / Math.PI + 90}deg`)
      p.innerHTML =
        '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><ellipse cx="12" cy="16" rx="5.5" ry="4.6"/><ellipse cx="5" cy="10.5" rx="2.1" ry="2.8"/><ellipse cx="9.5" cy="6" rx="2.1" ry="2.9"/><ellipse cx="14.5" cy="6" rx="2.1" ry="2.9"/><ellipse cx="19" cy="10.5" rx="2.1" ry="2.8"/></svg>'
      root.appendChild(p)
      p.addEventListener('animationend', () => p.remove())
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return <div ref={layer} aria-hidden className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" />
}

export default function Contact({ email }: { email: string }) {
  const [picked, setPicked] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [spin, setSpin] = useState(false)

  const brief = `Hi PACALIX, I'd like to build ${picked.length ? picked.join(', ').toLowerCase() : 'something'}.`
  const act = async () => {
    haptic([10, 30, 10])
    live.shake = 0.6
    sound.knock(0.9)
    if (email) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent('New project')}&body=${encodeURIComponent(brief)}`
      return
    }
    try {
      await navigator.clipboard.writeText(brief)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="flex w-full max-w-[1100px] flex-col items-center text-center">
      <Paws />
      <p className="inline-flex items-center gap-2.5 text-[15px] font-bold" style={{ color: 'var(--muted)' }}>
        <span aria-hidden className="inline-block h-[12px] w-[7px] -rotate-[14deg] rounded-full" style={{ background: 'var(--hot)' }} />
        Contact · from the aspen grove to your screen
      </p>
      <h2 data-react className="mt-6 font-display text-[clamp(48px,9.5vw,150px)] leading-[0.92] tracking-[-0.02em]">
        <MagneticLine text="Let's build" className="block" />
        <MagneticLine text="something rare." className="block" />
      </h2>

      <div className="mt-12 flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
        {/* A badge of rotating text around the panda: press it to start. */}
        <button
          onClick={act}
          onPointerEnter={() => setSpin(true)}
          onPointerLeave={() => setSpin(false)}
          data-hover={email ? 'Write' : 'Copy'}
          aria-label={email ? `Email ${email}` : 'Copy project brief'}
          className={`ring-badge relative h-[190px] w-[190px] shrink-0 ${spin ? 'fast' : ''}`}
        >
          <svg viewBox="0 0 200 200" className="ring-text absolute inset-0 h-full w-full">
            <defs>
              <path id="ring-path" d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0" />
            </defs>
            <text fontSize="14.5" fontWeight="800" letterSpacing="2.4" fill="currentColor">
              <textPath href="#ring-path">{RING}</textPath>
            </text>
          </svg>
          <span className="absolute inset-[42px] flex items-center justify-center rounded-full transition-colors duration-500" style={{ background: spin ? 'var(--hot)' : '#1a0b06' }}>
            {/* The logo is white on black: screen blending drops the black so only the panda shows. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/snake.png" alt="" className="w-[80%] select-none transition-transform duration-500" draggable={false} style={{ mixBlendMode: 'screen', transform: spin ? 'scale(1.08) rotate(-6deg)' : 'none' }} />
          </span>
        </button>

        <div className="max-w-[460px] text-left max-lg:text-center">
          <p className="text-[15px] font-bold" style={{ color: 'var(--muted)' }}>What are we making?</p>
          <div className="mt-3 flex flex-wrap gap-2 max-lg:justify-center">
            {KINDS.map((k) => {
              const on = picked.includes(k)
              return (
                <button
                  key={k}
                  aria-pressed={on}
                  onClick={() => {
                    setPicked(on ? picked.filter((p) => p !== k) : [...picked, k])
                    sound.pluck(hashText(k))
                    haptic(8)
                    live.pulse = 1
                  }}
                  className="rounded-full px-4 py-2 text-[14px] font-bold transition-all duration-300"
                  style={{
                    background: on ? 'var(--hot)' : 'transparent',
                    color: on ? '#fff' : 'var(--ink)',
                    boxShadow: on ? 'none' : 'inset 0 0 0 1.5px var(--line)',
                    transform: on ? 'rotate(-2deg) scale(1.04)' : 'none',
                  }}
                >
                  {k}
                </button>
              )
            })}
          </div>
          <p className="mt-6 text-[19px] font-bold leading-snug">“{brief}”</p>
          <div className="mt-6 flex flex-wrap items-center gap-4 max-lg:justify-center">
            <button onClick={act} data-hover="Go" className="rounded-full px-7 py-3.5 text-[16px] font-bold transition-transform hover:scale-105" style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
              {email ? 'Send it' : copied ? 'Copied ✓' : 'Copy my brief'}
            </button>
            <span className="text-[14px] font-bold" style={{ color: 'var(--muted)' }}>
              {email ? email : 'Direct email coming soon'}
            </span>
            <a href={PHONE_HREF} className="text-[14px] font-bold underline decoration-2 underline-offset-4" style={{ color: 'var(--muted)' }}>{PHONE}</a>
          </div>
          <p className="mt-6 text-[13px] font-bold" style={{ color: 'var(--muted)' }}>Clients worldwide · prices in CA$ · replies within a day</p>
        </div>
      </div>
    </div>
  )
}
