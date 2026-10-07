'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { live } from '@/lib/store'
import { haptic } from '@/lib/phone'
import { sound } from '@/lib/sound'

const N = 18
const TICK0 = 130
const RUST = '#c8471b'
const CREAM = '#f3dcc0'
const DARK = '#2a120a'
const LEAF = '#8fb35a'
const SHOOT = '#e7c14f'

type P = { x: number; y: number }

function readBest() {
  try {
    return Number(localStorage.getItem('pacalix-panda-best') || 0)
  } catch {
    return 0
  }
}

// Draws one bamboo leaf: a slim lance with a midrib, leaning a little.
export function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, angle = -0.6) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(-size * 0.5, 0)
  ctx.quadraticCurveTo(0, -size * 0.22, size * 0.5, 0)
  ctx.quadraticCurveTo(0, size * 0.22, -size * 0.5, 0)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,.25)'
  ctx.lineWidth = Math.max(1, size * 0.04)
  ctx.beginPath()
  ctx.moveTo(-size * 0.45, 0)
  ctx.lineTo(size * 0.4, 0)
  ctx.stroke()
  ctx.restore()
}

// The red panda's head, facing its direction of travel: rust fur, white ears and cheeks, dark tear marks.
export function drawPandaHead(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number, dir: P, blink = false) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(Math.atan2(dir.y, dir.x) + Math.PI / 2)
  const r = cell * 0.5
  // ears
  for (const sx of [-1, 1]) {
    ctx.fillStyle = CREAM
    ctx.beginPath()
    ctx.moveTo(sx * r * 0.95, -r * 0.2)
    ctx.lineTo(sx * r * 0.75, -r * 1.05)
    ctx.lineTo(sx * r * 0.2, -r * 0.6)
    ctx.fill()
    ctx.fillStyle = DARK
    ctx.beginPath()
    ctx.moveTo(sx * r * 0.78, -r * 0.35)
    ctx.lineTo(sx * r * 0.7, -r * 0.82)
    ctx.lineTo(sx * r * 0.38, -r * 0.55)
    ctx.fill()
  }
  // face
  ctx.fillStyle = RUST
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.95, r * 0.85, 0, 0, Math.PI * 2)
  ctx.fill()
  // white brows and muzzle
  ctx.fillStyle = CREAM
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(sx * r * 0.38, -r * 0.38, r * 0.2, r * 0.12, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.ellipse(0, r * 0.3, r * 0.55, r * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()
  // tear marks running from the eyes
  ctx.fillStyle = DARK
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(sx * r * 0.42, r * 0.12, r * 0.1, r * 0.28, sx * -0.35, 0, Math.PI * 2)
    ctx.fill()
    if (blink) ctx.fillRect(sx * r * 0.36 - r * 0.12, -r * 0.13, r * 0.24, r * 0.05)
    else {
      ctx.beginPath()
      ctx.arc(sx * r * 0.36, -r * 0.1, r * 0.11, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // nose
  ctx.beginPath()
  ctx.ellipse(0, r * 0.18, r * 0.13, r * 0.09, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// A tail ring: the red panda's tail alternates rust and cream bands.
export function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, i: number, len: number) {
  const k = 1 - (i / Math.max(len, 2)) * 0.35
  const pad = cell * (0.5 - 0.42 * k)
  ctx.fillStyle = Math.floor(i / 2) % 2 === 0 ? RUST : CREAM
  ctx.beginPath()
  ctx.roundRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2, cell * 0.4)
  ctx.fill()
  if (i === len - 1) {
    ctx.fillStyle = DARK
    ctx.beginPath()
    ctx.arc(x + cell / 2, y + cell / 2, cell * 0.18, 0, Math.PI * 2)
    ctx.fill()
  }
}

// The hidden game: the PACALIX beaver eats leaves and its ringed tail grows.
// A golden shoot appears now and then: worth three, but it does not wait.
export default function PandaGame({ onClose }: { onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [over, setOver] = useState(false)
  const [started, setStarted] = useState(false)
  const [msg, setMsg] = useState('')
  const state = useRef({
    body: [] as P[],
    dir: { x: 1, y: 0 } as P,
    next: { x: 1, y: 0 } as P,
    leaf: { x: 12, y: 9 } as P,
    shoot: null as (P & { ttl: number }) | null,
    score: 0,
    over: false,
    started: false,
    pops: [] as { x: number; y: number; t: number; text: string }[],
  })

  const free = useCallback(() => {
    const s = state.current
    for (;;) {
      const a = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 }
      if (!s.body.some((b) => b.x === a.x && b.y === a.y) && !(s.leaf.x === a.x && s.leaf.y === a.y)) return a
    }
  }, [])

  const reset = useCallback(() => {
    const s = state.current
    s.body = [{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }]
    s.dir = { x: 1, y: 0 }
    s.next = { x: 1, y: 0 }
    s.score = 0
    s.over = false
    s.started = false
    s.shoot = null
    s.pops = []
    s.leaf = free()
    setScore(0)
    setOver(false)
    setStarted(false)
    setMsg('')
  }, [free])

  useEffect(() => {
    setBest(readBest())
    reset()
  }, [reset])

  useEffect(() => {
    const turn = (x: number, y: number) => {
      const s = state.current
      if (x === -s.dir.x && y === -s.dir.y) return
      s.next = { x, y }
      if (!s.started) {
        s.started = true
        setStarted(true)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'escape') return onClose()
      if (state.current.over && (k === ' ' || k === 'enter')) return reset()
      const map: Record<string, [number, number]> = {
        arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
        arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
      }
      if (map[k]) {
        e.preventDefault()
        turn(map[k][0], map[k][1])
      }
    }
    let sx = 0
    let sy = 0
    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX
      sy = e.touches[0].clientY
    }
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx
      const dy = e.changedTouches[0].clientY - sy
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
        if (state.current.over) reset()
        return
      }
      if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0)
      else turn(0, dy > 0 ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  }, [onClose, reset])

  useEffect(() => {
    let last = performance.now()
    let acc = 0
    let raf = 0

    const draw = (now: number) => {
      const c = canvas.current
      if (!c) return
      const ctx = c.getContext('2d')
      if (!ctx) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const size = c.clientWidth
      if (c.width !== size * dpr) {
        c.width = size * dpr
        c.height = size * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, size)
      const cell = size / N
      const s = state.current
      const th = live.theme
      // a bamboo grove in the background: faint culms with nodes
      ctx.globalAlpha = 0.07
      ctx.fillStyle = th.ink
      for (let i = 0; i < 6; i++) {
        const x = ((i * 0.17 + 0.06) % 1) * size
        ctx.fillRect(x, 0, cell * 0.35, size)
        for (let y = (i * 37) % (cell * 3); y < size; y += cell * 3) ctx.fillRect(x - cell * 0.06, y, cell * 0.47, cell * 0.12)
      }
      ctx.globalAlpha = 1
      // the leaf sways
      const sway = Math.sin(now / 300) * 0.25
      drawLeaf(ctx, (s.leaf.x + 0.5) * cell, (s.leaf.y + 0.5) * cell, cell * 1.05, LEAF, -0.6 + sway)
      // the golden shoot pulses while it lasts
      if (s.shoot) {
        const pulse = 1 + Math.sin(now / 90) * 0.12
        ctx.save()
        ctx.globalAlpha = Math.min(1, s.shoot.ttl / 12)
        ctx.fillStyle = SHOOT
        const x = (s.shoot.x + 0.5) * cell
        const y = (s.shoot.y + 0.5) * cell
        ctx.beginPath()
        ctx.moveTo(x, y - cell * 0.5 * pulse)
        ctx.quadraticCurveTo(x + cell * 0.35 * pulse, y + cell * 0.1, x, y + cell * 0.45)
        ctx.quadraticCurveTo(x - cell * 0.35 * pulse, y + cell * 0.1, x, y - cell * 0.5 * pulse)
        ctx.fill()
        ctx.restore()
      }
      // the tail, from its tip to the head
      for (let i = s.body.length - 1; i > 0; i--) drawRing(ctx, s.body[i].x * cell, s.body[i].y * cell, cell, i, s.body.length)
      const h = s.body[0]
      if (h) drawPandaHead(ctx, (h.x + 0.5) * cell, (h.y + 0.5) * cell, cell * 1.15, s.dir, s.over || Math.sin(now / 1700) > 0.985)
      // floating "+1" pops
      s.pops = s.pops.filter((p) => now - p.t < 700)
      ctx.font = `bold ${Math.round(cell * 0.8)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      for (const p of s.pops) {
        const k = (now - p.t) / 700
        ctx.globalAlpha = 1 - k
        ctx.fillStyle = th.ink
        ctx.fillText(p.text, (p.x + 0.5) * cell, (p.y + 0.2 - k * 1.5) * cell)
      }
      ctx.globalAlpha = 1
    }

    const end = () => {
      const s = state.current
      s.over = true
      setOver(true)
      haptic([25, 50, 25])
      sound.pluck(3)
      live.shake = 1
      const b = Math.max(readBest(), s.score)
      if (s.score > readBest() && s.score > 0) setMsg('New best. The grove remembers.')
      else setMsg(s.score > 15 ? 'A long tail. Well climbed.' : 'Bonk. Beavers nap after that.')
      try {
        localStorage.setItem('pacalix-panda-best', String(b))
      } catch {
        // storage unavailable
      }
      setBest(b)
    }

    const step = () => {
      const s = state.current
      if (s.over || !s.started) return
      s.dir = s.next
      const head = { x: s.body[0].x + s.dir.x, y: s.body[0].y + s.dir.y }
      const hit = head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || s.body.some((b, i) => i < s.body.length - 1 && b.x === head.x && b.y === head.y)
      if (hit) return end()
      s.body.unshift(head)
      let grow = 0
      if (head.x === s.leaf.x && head.y === s.leaf.y) {
        grow = 1
        s.leaf = free()
        if (!s.shoot && Math.random() < 0.22) s.shoot = { ...free(), ttl: 38 }
      }
      if (s.shoot && head.x === s.shoot.x && head.y === s.shoot.y) {
        grow = 3
        s.shoot = null
      }
      if (s.shoot && --s.shoot.ttl <= 0) s.shoot = null
      if (grow) {
        s.score += grow
        haptic(grow > 1 ? [10, 30, 10] : 12)
        sound.pluck(s.score * 3 + grow)
        live.pulse = Math.min(1, live.pulse + 0.4)
        s.pops.push({ x: head.x, y: head.y, t: performance.now(), text: `+${grow}` })
        setScore(s.score)
        // the tail grows by as many rings as the food was worth
        for (let i = 1; i < grow; i++) s.body.push({ ...s.body[s.body.length - 1] })
      } else s.body.pop()
    }

    const loop = (now: number) => {
      acc += now - last
      last = now
      const tick = Math.max(70, TICK0 - state.current.score * 2.2)
      while (acc > tick) {
        acc -= tick
        step()
      }
      draw(now)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [free])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hidden game: Beaver"
      className="fixed inset-0 z-[80] flex items-center justify-center p-5 backdrop-blur-md"
      style={{ background: 'color-mix(in srgb, var(--bg) 94%, transparent)' }}
    >
      <div className="flex w-[min(88vw,500px)] flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: RUST }}>Hidden game</p>
            <p className="font-display text-[clamp(26px,5vw,38px)] leading-none">Feed the beaver</p>
          </div>
          <p className="text-right text-[15px] font-bold" style={{ color: 'var(--muted)' }}>
            <span className="font-display text-[30px] leading-none" style={{ color: 'var(--ink)' }}>{score}</span>
            <span className="block">best {best}</span>
          </p>
        </div>
        <canvas ref={canvas} className="aspect-square w-full rounded-2xl border" style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb, var(--ink) 3%, transparent)' }} />
        <div className="flex items-center justify-between gap-4 text-[14px] font-bold" style={{ color: 'var(--muted)' }}>
          <span>
            {over ? msg : started ? 'Leaf +1 · golden shoot +3 · faster as it grows' : 'Arrow keys, WASD or swipe to start'}
          </span>
          <span className="flex shrink-0 gap-5">
            {over && (
              <button onClick={reset} style={{ color: 'var(--ink)' }} className="underline-offset-4 hover:underline focus-visible:underline">
                Again
              </button>
            )}
            <button onClick={onClose} style={{ color: 'var(--ink)' }} className="underline-offset-4 hover:underline focus-visible:underline">
              Close
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
