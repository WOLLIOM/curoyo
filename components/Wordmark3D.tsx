'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildWordmarkData } from '@/lib/targets'
import { live, useStore } from '@/lib/store'
import LiveMark from './LiveMark'
import { tier } from '@/lib/perf'

// The CUROYO wordmark as live matter, gathering just after the snake.
export default function Wordmark3D() {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const size = useMemo(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 96 : tier() === 'low' ? 128 : 176), [])

  useEffect(() => {
    let raf = 0
    const find = () => {
      const a = document.getElementById('wordmark-anchor')
      if (a) setEl(a)
      else raf = requestAnimationFrame(find)
    }
    find()
    return () => {
      cancelAnimationFrame(raf)
      useStore.getState().setLiveWordmark(false)
    }
  }, [])

  const load = useCallback((_: HTMLElement, s: number) => buildWordmarkData(s), [])
  const onReady = useCallback((ok: boolean) => {
    live.wm = true
    useStore.getState().setLiveWordmark(ok)
  }, [])

  return el ? <LiveMark anchor={el} size={size} load={load} start={1} onReady={onReady} /> : null
}
