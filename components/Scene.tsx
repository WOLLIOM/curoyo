'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import Particles from './Particles'
import Wordmark3D from './Wordmark3D'
import SpotField from './SpotField'
import LiveTypes from './LiveTypes'
import { lite, tier } from '@/lib/perf'
import { useStore } from '@/lib/store'

// Development only: with ?step in the URL the scene runs on a manual clock, so it can be inspected frame by frame.
// When even the lowest resolution can't hold a smooth frame rate, render at a steady 30 fps instead of fighting for 60.
// Heartbeat state for the canvas that is mounted right now. `frames` counts frames drawn by it, so a canvas that is
// still compiling its shaders is never mistaken for a frozen one.
const beat = { t: 0, frames: 0, gl: null as null | WebGLRenderingContext | WebGL2RenderingContext }
function Beat({ restart }: { restart: () => void }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const ctx = gl.getContext()
    const c = gl.domElement
    let alive = true
    beat.gl = ctx
    beat.t = performance.now()
    beat.frames = 0
    const lost = (e: Event) => {
      e.preventDefault()
      // If the browser does not give this context back, make a new one.
      window.setTimeout(() => alive && ctx.isContextLost() && restart(), 1200)
    }
    const restored = () => alive && restart()
    c.addEventListener('webglcontextlost', lost)
    c.addEventListener('webglcontextrestored', restored)
    return () => {
      // This canvas is going away on purpose (three.js then drops its context): stop watching it.
      alive = false
      c.removeEventListener('webglcontextlost', lost)
      c.removeEventListener('webglcontextrestored', restored)
      if (beat.gl === ctx) beat.gl = null
    }
  }, [gl, restart])
  useFrame(() => {
    beat.t = performance.now()
    beat.frames++
  })
  return null
}

function Throttle() {
  const advance = useThree((s) => s.advance)
  const get = useThree((s) => s.get)
  useEffect(() => {
    let raf = 0
    let last = 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden || t - last < 31) return
      // Step the scene's own clock forward. (Passing the rAF timestamp mixed two clocks: on some browsers it gave
      // one huge negative frame that turned the whole particle sim into NaN, freezing or blanking every shape.)
      const step = last ? Math.min(0.1, Math.max(0.001, (t - last) / 1000)) : 1 / 30
      last = t
      advance(get().clock.elapsedTime + step)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [advance, get])
  return null
}

function Stepper() {
  const advance = useThree((s) => s.advance)
  useEffect(() => {
    let t = 0
    const w = window as unknown as { __advance?: (seconds: number) => void }
    w.__advance = (seconds: number) => {
      const frames = Math.round(seconds * 60)
      for (let i = 0; i < frames; i++) {
        t += 1 / 60
        advance(t)
      }
    }
    return () => {
      delete w.__advance
    }
  }, [advance])
  return null
}

export default function Scene() {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(false)
  // Adaptive quality: start sharp, and drop the resolution (never the design) if the device can't keep up.
  const [maxDpr, setMaxDpr] = useState(2)
  const [dpr, setDpr] = useState(1.5)
  const [slow, setSlow] = useState(false)
  // If the browser drops the GPU context (heavy load, tab switch), every shape texture is lost: rebuild the whole scene.
  const [epoch, setEpoch] = useState(0)
  const restarts = useRef<number[]>([])
  useEffect(() => {
    setStep(process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).has('step'))
    const phone = window.innerWidth < 768
    const weak = tier() === 'low'
    const top = Math.min(window.devicePixelRatio || 1, lite() ? 1 : phone ? 2 : weak ? 1.25 : 1.75)
    setMaxDpr(top)
    // Start a notch below the ceiling; the monitor climbs back up if the device has room to spare.
    setDpr(Math.min(top, phone || weak ? 1 : 1.5))
    setMounted(true)
  }, [])
  // Watchdog: if the real frame rate stays low (an old or busy computer), switch to the light mode for good:
  // fewer particles, no live headlines, lowest resolution, a steady 30 fps. The design stays; only the weight drops.
  const ready = useStore((s) => s.ready)
  useEffect(() => {
    if (step || !ready) return
    let raf = 0
    let n = 0
    let t0 = 0
    let bad = 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden) {
        t0 = 0
        return
      }
      if (!t0) {
        t0 = t
        n = 0
        return
      }
      n++
      if (t - t0 >= 2500) {
        const ms = (t - t0) / n
        bad = ms > 30 ? bad + 1 : 0
        t0 = t
        n = 0
        if (bad >= 2) {
          cancelAnimationFrame(raf)
          useStore.getState().setStruggling(true)
          setDpr(0.85)
          setSlow(true)
        }
      }
    }
    // Give the first seconds (shader compiles, textures) a pass before judging.
    const id = window.setTimeout(() => (raf = requestAnimationFrame(loop)), 3000)
    return () => {
      window.clearTimeout(id)
      cancelAnimationFrame(raf)
    }
  }, [step, ready])
  // Heartbeat: if the scene stops drawing while the page is visible (a webview that suspended the GPU, a lost
  // context), restart it instead of leaving the world frozen. At most a few restarts a minute, so it can never loop.
  const restart = useCallback(() => {
    const now = performance.now()
    restarts.current = restarts.current.filter((t) => now - t < 60000)
    if (restarts.current.length >= 3) return
    restarts.current.push(now)
    beat.t = now
    beat.frames = 0
    beat.gl = null
    setEpoch((n) => n + 1)
  }, [])
  useEffect(() => {
    if (step) return
    const frozen = () => !document.hidden && (beat.gl?.isContextLost() || (beat.frames > 10 && performance.now() - beat.t > 2500))
    const id = window.setInterval(() => frozen() && restart(), 1000)
    // Coming back from another app: the phone may have taken the GPU away meanwhile.
    const back = () => {
      if (document.hidden) return
      beat.t = performance.now()
      window.setTimeout(() => frozen() && restart(), 1500)
    }
    document.addEventListener('visibilitychange', back)
    window.addEventListener('pageshow', back)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', back)
      window.removeEventListener('pageshow', back)
    }
  }, [step, restart])
  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        key={epoch}
        dpr={dpr}
        frameloop={step || slow ? 'never' : 'always'}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: step }}
        camera={{ position: [0, 0, 8], fov: 50, near: 0.1, far: 60 }}
      >
        {!step && (
          <PerformanceMonitor
            flipflops={4}
            onDecline={() => {
              if (dpr <= 0.9) {
                setSlow(true)
                useStore.getState().setStruggling(true)
              }
              setDpr((d) => Math.max(0.85, +(d - 0.25).toFixed(2)))
            }}
            onIncline={() => setDpr((d) => Math.min(maxDpr, +(d + 0.25).toFixed(2)))}
            onFallback={() => {
              setDpr(0.85)
              setSlow(true)
            }}
          />
        )}
        {!step && <Beat restart={restart} />}
        <SpotField />
        <Particles />
        <Wordmark3D />
        <LiveTypes />
        {step && <Stepper />}
        {slow && !step && <Throttle />}
      </Canvas>
    </div>
  )
}
