'use client'

import { useEffect, useRef } from 'react'

// Small words drift up around the cursor while it moves over text, like thoughts leaving a curious animal.
const WORDS = ['timber', 'curious', 'climb', 'idea', '3D', 'rare', 'play', 'build', 'dam', 'build', 'shape', 'wild', 'soft', 'look up']

export default function HoverWords() {
  const layer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = layer.current
    if (!root) return
    let last = 0
    let lx = 0
    let ly = 0
    let k = (Math.random() * WORDS.length) | 0
    const move = (e: PointerEvent) => {
      const t = e.target instanceof Element ? e.target.closest('[data-react]') : null
      if (!t) return
      const now = performance.now()
      const d = Math.hypot(e.clientX - lx, e.clientY - ly)
      if (now - last < 260 || d < 40) return
      last = now
      lx = e.clientX
      ly = e.clientY
      if (root.childElementCount > 8) root.firstElementChild?.remove()
      const w = document.createElement('span')
      w.className = 'hover-word'
      w.textContent = WORDS[k++ % WORDS.length]
      const a = Math.random() * Math.PI * 2
      const r = 28 + Math.random() * 30
      w.style.left = `${e.clientX + Math.cos(a) * r}px`
      w.style.top = `${e.clientY + Math.sin(a) * r}px`
      w.style.setProperty('--dx', `${(Math.random() - 0.5) * 60}px`)
      w.style.setProperty('--rot', `${(Math.random() - 0.5) * 30}deg`)
      root.appendChild(w)
      w.addEventListener('animationend', () => w.remove())
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return <div ref={layer} aria-hidden className="pointer-events-none fixed inset-0 z-[45] overflow-hidden" />
}
