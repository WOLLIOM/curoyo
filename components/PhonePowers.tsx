'use client'

import { useEffect, useState } from 'react'
import { live, useStore } from '@/lib/store'
import { enableMotion, motionSupported } from '@/lib/motion'
import { breathing, haptic, startBreath, stopBreath } from '@/lib/phone'

// Three things a phone can do here. On a desktop they still work: shake is a button, and blowing works with any mic.
export default function PhonePowers() {
  const gyroOn = useStore((s) => s.gyroOn)
  const [canTilt, setCanTilt] = useState(false)
  const [blow, setBlow] = useState(false)
  const [level, setLevel] = useState(0)

  useEffect(() => setCanTilt(motionSupported()), [])
  useEffect(() => () => stopBreath(), [])
  useEffect(() => {
    if (!blow) return
    let raf = 0
    const tick = () => {
      setLevel(live.blow)
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [blow])

  const pill = 'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-bold transition-colors'
  const on = { background: 'var(--ink)', color: 'var(--bg)' }
  const off = { background: 'color-mix(in srgb, var(--ink) 12%, transparent)', color: 'var(--ink)' }

  return (
    <div className="mt-8 flex flex-wrap gap-2.5 max-lg:justify-center">
      {canTilt ? (
        <button className={pill} style={gyroOn ? on : off} onClick={() => (gyroOn ? useStore.getState().setGyroOn(false) : enableMotion())}>
          {gyroOn ? 'Tilt: on. Tilt your phone' : 'Turn on tilt'}
        </button>
      ) : null}
      <button
        className={pill}
        style={off}
        data-hover="Shake"
        onClick={() => {
          live.shake = 1
          live.lastInput = performance.now()
          haptic([18, 40, 12])
        }}
      >
        {canTilt && gyroOn ? 'Shake your phone' : 'Shake it'}
      </button>
      <button
        className={pill}
        style={blow ? on : off}
        data-hover="Blow"
        onClick={async () => {
          if (breathing()) {
            stopBreath()
            setBlow(false)
          } else if (await startBreath()) setBlow(true)
        }}
      >
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: blow ? 'var(--bg)' : 'var(--ink)', transform: `scale(${1 + level * 2.2})`, transition: 'transform 80ms' }} />
        {blow ? 'Blow on the screen' : 'Blow on it (mic)'}
      </button>
    </div>
  )
}
