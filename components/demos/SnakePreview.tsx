'use client'

import { useEffect, useRef, useState } from 'react'
import { live, useStore } from '@/lib/store'
import { drawLeaf, drawPandaHead, drawRing } from '@/components/SnakeGame'

// The red panda plays itself until you take over: it chases bamboo leaves and its ringed tail grows.

const N = 14

export default function SnakePreview() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [eaten, setEaten] = useState(0)

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    let body = [{ x: 4, y: 7 }, { x: 3, y: 7 }, { x: 2, y: 7 }]
    let dir = { x: 1, y: 0 }
    let leaf = { x: 10, y: 7 }
    let id = 0
    let count = 0
    const free = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && !body.some((b) => b.x === x && b.y === y)
    const place = () => {
      do leaf = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 }
      while (body.some((b) => b.x === leaf.x && b.y === leaf.y))
    }
    const step = () => {
      const h = body[0]
      const dirs = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ].filter((d) => free(h.x + d.x, h.y + d.y))
      if (!dirs.length) {
        body = [{ x: 4, y: 7 }, { x: 3, y: 7 }, { x: 2, y: 7 }]
        place()
        return
      }
      dirs.sort((a, b) => Math.abs(h.x + a.x - leaf.x) + Math.abs(h.y + a.y - leaf.y) - (Math.abs(h.x + b.x - leaf.x) + Math.abs(h.y + b.y - leaf.y)))
      dir = Math.random() < 0.9 ? dirs[0] : dirs[(Math.random() * dirs.length) | 0]
      const nh = { x: h.x + dir.x, y: h.y + dir.y }
      body.unshift(nh)
      if (nh.x === leaf.x && nh.y === leaf.y) {
        if (body.length > 26) body = body.slice(0, 4)
        count++
        setEaten(count)
        place()
      } else body.pop()
    }
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const size = Math.min(c.clientWidth, c.clientHeight)
      if (c.width !== size * dpr) {
        c.width = size * dpr
        c.height = size * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const cell = size / N
      ctx.clearRect(0, 0, size, size)
      ctx.globalAlpha = 0.06
      ctx.fillStyle = live.theme.ink
      for (let i = 1; i < N; i++) {
        ctx.fillRect(i * cell, 0, 1, size)
        ctx.fillRect(0, i * cell, size, 1)
      }
      ctx.globalAlpha = 1
      drawLeaf(ctx, (leaf.x + 0.5) * cell, (leaf.y + 0.5) * cell, cell * 1.05, '#8fb35a')
      for (let i = body.length - 1; i > 0; i--) drawRing(ctx, body[i].x * cell, body[i].y * cell, cell, i, body.length)
      drawPandaHead(ctx, (body[0].x + 0.5) * cell, (body[0].y + 0.5) * cell, cell * 1.15, dir)
    }
    // Only plays while on screen.
    let visible = false
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(c)
    id = window.setInterval(() => {
      if (!visible) return
      step()
      draw()
    }, 140)
    draw()
    return () => {
      window.clearInterval(id)
      io.disconnect()
    }
  }, [])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="relative w-full max-w-[260px]">
        <canvas ref={canvas} className="aspect-square w-full rounded-xl" style={{ background: 'color-mix(in srgb, var(--ink) 4%, transparent)' }} />
        <span className="absolute right-2 top-2 rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
          Autopilot · {eaten} leaves
        </span>
      </div>
      <button
        onClick={() => useStore.getState().setGame(true)}
        data-hover="Play"
        className="rounded-full px-5 py-2.5 text-[14px] font-bold transition-transform hover:scale-105"
        style={{ background: '#c8471b', color: '#fff6ec' }}
      >
        Take the paws
      </button>
      <p className="text-center text-[12px] font-bold" style={{ color: 'var(--muted)' }}>
        Or type <kbd className="rounded px-1.5 py-0.5" style={{ boxShadow: 'inset 0 0 0 1px var(--line)' }}>panda</kbd> anywhere
      </p>
    </div>
  )
}
