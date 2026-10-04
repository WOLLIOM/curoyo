'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useEffect, useState } from 'react'
import Particles from './Particles'
import Wordmark3D from './Wordmark3D'
import SpotField from './SpotField'
import LiveTypes from './LiveTypes'

// Development only: with ?step in the URL the scene runs on a manual clock, so it can be inspected frame by frame.
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
  useEffect(() => {
    setStep(process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).has('step'))
    const phone = window.innerWidth < 768
    const top = Math.min(window.devicePixelRatio || 1, phone ? 2 : 1.75)
    setMaxDpr(top)
    // Start a notch below the ceiling; the monitor climbs back up if the device has room to spare.
    setDpr(Math.min(top, phone ? 1 : 1.5))
    setMounted(true)
  }, [])
  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        dpr={dpr}
        frameloop={step ? 'never' : 'always'}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: step }}
        camera={{ position: [0, 0, 8], fov: 50, near: 0.1, far: 60 }}
      >
        {!step && (
          <PerformanceMonitor
            flipflops={4}
            onDecline={() => setDpr((d) => Math.max(0.85, +(d - 0.25).toFixed(2)))}
            onIncline={() => setDpr((d) => Math.min(maxDpr, +(d + 0.25).toFixed(2)))}
            onFallback={() => setDpr(0.85)}
          />
        )}
        <SpotField />
        <Particles />
        <Wordmark3D />
        <LiveTypes />
        {step && <Stepper />}
      </Canvas>
    </div>
  )
}
