'use client'

import { useEffect, useState } from 'react'
import { live, useStore } from '@/lib/store'
import { enableMotion, motionSupported } from '@/lib/motion'
import { listenForShake } from '@/lib/phone'

// Optional motion: only offered on touch devices, only on a tap, never required.
// On a first visit a small invitation appears; tilting the phone then moves the light, the depth and the spots.
export default function Gyro() {
  const { gyroOn, setGyroOn, ready } = useStore()
  const [supported, setSupported] = useState(false)
  const [invite, setInvite] = useState(false)

  useEffect(() => setSupported(motionSupported()), [])

  useEffect(() => {
    if (!supported || !ready || gyroOn) return
    let seen = false
    try {
      seen = sessionStorage.getItem('curoyo-motion-invite') === '1'
    } catch {
      // storage unavailable
    }
    if (seen) return
    const show = window.setTimeout(() => setInvite(true), 2600)
    return () => window.clearTimeout(show)
  }, [supported, ready, gyroOn])

  useEffect(() => {
    if (!gyroOn) {
      live.tilt.x = 0
      live.tilt.y = 0
      listenForShake(false)
      document.documentElement.classList.remove('gyro-on')
      return
    }
    document.documentElement.classList.add('gyro-on')
    let base: { b: number; g: number } | null = null
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return
      if (!base) base = { b: e.beta, g: e.gamma }
      const clamp = (v: number) => Math.max(-1, Math.min(1, v))
      // Low-pass filtered: raw sensor noise never reaches the scene, and the neutral pose slowly follows how you hold the phone.
      const angle = (screen.orientation && screen.orientation.angle) || 0
      let gx = e.gamma - base.g
      let gy = e.beta - base.b
      if (angle === 90) [gx, gy] = [gy, -gx]
      else if (angle === 270 || angle === -90) [gx, gy] = [-gy, gx]
      base.g += (e.gamma - base.g) * 0.004
      base.b += (e.beta - base.b) * 0.004
      live.tilt.x += (clamp(gx / 13) - live.tilt.x) * 0.14
      live.tilt.y += (clamp(gy / 13) - live.tilt.y) * 0.14
      live.interacted = true
      document.documentElement.style.setProperty('--tilt-x', live.tilt.x.toFixed(2))
      document.documentElement.style.setProperty('--tilt-y', live.tilt.y.toFixed(2))
      if (Math.abs(live.tilt.x) > 0.08 || Math.abs(live.tilt.y) > 0.08) live.lastInput = performance.now()
    }
    window.addEventListener('deviceorientation', onOrient)
    return () => {
      window.removeEventListener('deviceorientation', onOrient)
      document.documentElement.classList.remove('gyro-on')
    }
  }, [gyroOn])

  if (!supported) return null

  const dismiss = () => {
    setInvite(false)
    try {
      sessionStorage.setItem('curoyo-motion-invite', '1')
    } catch {
      // storage unavailable
    }
  }

  return (
    <>
      {invite && !gyroOn && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div
            className="invite-in flex items-center gap-3 rounded-full py-2 pl-3 pr-2 text-[15px] font-bold shadow-2xl backdrop-blur-xl"
            style={{ background: 'color-mix(in srgb, var(--bg) 70%, transparent)', boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--ink) 30%, transparent), 0 20px 60px rgba(0,0,0,.35)' }}
          >
            <PhoneIcon on={false} />
            <span className="leading-tight">
              Tilt to move the world
              <span className="block text-[12px] font-bold" style={{ color: 'var(--muted)' }}>Shake to scatter it</span>
            </span>
            <button
              onClick={async () => {
                dismiss()
                await enableMotion()
              }}
              className="rounded-full px-5 py-2.5"
              style={{ background: 'var(--ink)', color: 'var(--bg)' }}
            >
              Turn on
            </button>
            <button onClick={dismiss} aria-label="Dismiss" className="px-2 opacity-60">
              ✕
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => (gyroOn ? setGyroOn(false) : enableMotion())}
        aria-pressed={gyroOn}
        className="flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3.5 text-[14px] font-bold transition-colors"
        style={{
          background: gyroOn ? 'var(--ink)' : 'transparent',
          color: gyroOn ? 'var(--bg)' : 'var(--ink)',
          boxShadow: gyroOn ? 'none' : 'inset 0 0 0 1.5px color-mix(in srgb, var(--ink) 45%, transparent)',
        }}
      >
        <PhoneIcon on={gyroOn} />
        Motion {gyroOn ? 'on' : 'off'}
      </button>
    </>
  )
}

// A little phone that rocks side to side, so it is obvious what the button does.
function PhoneIcon({ on }: { on: boolean }) {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden className={on ? 'tilt-live' : 'tilt-rock'}>
      <rect x="3" y="1.5" width="12" height="19" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="16.5" r="1.3" fill="currentColor" />
    </svg>
  )
}
