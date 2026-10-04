'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// The page stops scrolling down and the cards travel sideways like a film strip, then it lets go again.
export default function HStrip({ children, length = 2.1 }: { children: ReactNode; length?: number }) {
  const outer = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const o = outer.current
    const t = track.current
    if (!o || !t) return
    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const r = o.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)))
      const dist = Math.max(0, t.scrollWidth - window.innerWidth)
      t.style.transform = `translate3d(${-p * dist}px,0,0)`
    }
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
    }
  }, [])

  return (
    <div ref={outer} style={{ height: `${Math.round(length * 100)}svh` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <div ref={track} className="flex w-max items-stretch gap-5 px-6 will-change-transform sm:gap-8 sm:px-10">
          {children}
        </div>
      </div>
    </div>
  )
}
