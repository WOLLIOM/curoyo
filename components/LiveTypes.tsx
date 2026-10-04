'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildTextData } from '@/lib/livetype'
import LiveMark from './LiveMark'
import { lite, tier } from '@/lib/perf'
import { useStore } from '@/lib/store'

// Headlines marked with data-live become live type when they come near the screen,
// and dissolve back to plain text (and free their GPU memory) when they're far away.
export default function LiveTypes() {
  const [els, setEls] = useState<HTMLElement[]>([])
  // Headlines wake up a couple of seconds after the intro, never during it.
  const ready = useStore((s) => s.ready)
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!ready) return
    const t = window.setTimeout(() => setArmed(true), 2500)
    return () => window.clearTimeout(t)
  }, [ready])
  const [active, setActive] = useState<Set<HTMLElement>>(new Set())
  // Each headline builds its own GPU simulation, so they wake one at a time and never while you are scrolling.
  const [mounted, setMounted] = useState<Set<HTMLElement>>(new Set())
  useEffect(() => {
    if (!armed) return
    let lastScroll = 0
    const onScroll = () => (lastScroll = performance.now())
    window.addEventListener('scroll', onScroll, { passive: true })
    const id = window.setInterval(() => {
      setMounted((prev) => {
        const keep = new Set([...prev].filter((e) => active.has(e)))
        let changed = keep.size !== prev.size
        if (performance.now() - lastScroll > 450) {
          const vh = window.innerHeight
          const next = [...active]
            .filter((e) => !keep.has(e))
            .sort((a, b) => Math.abs(a.getBoundingClientRect().top - vh * 0.4) - Math.abs(b.getBoundingClientRect().top - vh * 0.4))[0]
          if (next) {
            keep.add(next)
            changed = true
          }
        }
        return changed ? keep : prev
      })
    }, 450)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearInterval(id)
    }
  }, [armed, active])
  const size = useMemo(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 88 : tier() === 'low' ? 112 : 144), [])

  useEffect(() => {
    let raf = 0
    let tries = 0
    const find = () => {
      const list = Array.from(document.querySelectorAll<HTMLElement>('[data-live]'))
      if (list.length || tries++ > 120) setEls(list)
      else raf = requestAnimationFrame(find)
    }
    find()
    return () => cancelAnimationFrame(raf)
  }, [])

  // Active = within about half a screen of the viewport. Checked on scroll and resize; cheap for a handful of headlines.
  useEffect(() => {
    if (!els.length) return
    let queued = false
    const check = () => {
      queued = false
      const vh = window.innerHeight
      const next = new Set<HTMLElement>()
      els.forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.bottom > -vh * 0.8 && r.top < vh * 2.6) next.add(el)
      })
      setActive((prev) => (prev.size === next.size && [...next].every((e) => prev.has(e)) ? prev : next))
    }
    const queue = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    const id = window.setInterval(check, 800)
    return () => {
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      window.clearInterval(id)
    }
  }, [els])

  return (
    <>
      {els
        .filter((el) => armed && !lite() && mounted.has(el))
        .map((el, i) => (
          <LiveMark key={el.dataset.live || i} anchor={el} size={size} load={buildTextData} hideAnchor />
        ))}
    </>
  )
}
