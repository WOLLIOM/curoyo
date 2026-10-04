import { live } from './store'

// What a phone can do that a desktop can't: feel a shake, buzz back, and hear a breath.
// Everything is opt-in and degrades silently where unsupported.

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function haptic(pattern: number | number[] = 10) {
  if (reduced()) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // unsupported (iOS Safari): fine
  }
}

// Shake: a sharp change in acceleration scatters the particles, then they find their way back.
let shakeOn = false
let last = { x: 0, y: 0, z: 0 }
let lastShake = 0
function onMotion(e: DeviceMotionEvent) {
  const a = e.accelerationIncludingGravity
  if (!a || a.x == null || a.y == null || a.z == null) return
  const jerk = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z)
  last = { x: a.x, y: a.y, z: a.z }
  const now = performance.now()
  if (jerk > 24 && now - lastShake > 700) {
    lastShake = now
    live.shake = 1
    live.lastInput = now
    haptic([18, 40, 12])
  }
}
export function listenForShake(on: boolean) {
  if (on === shakeOn || typeof window === 'undefined') return
  shakeOn = on
  if (on) window.addEventListener('devicemotion', onMotion)
  else window.removeEventListener('devicemotion', onMotion)
}

// Breath: the microphone's low rumble when you blow on it becomes wind. Nothing is recorded or sent.
let stream: MediaStream | null = null
let ctx: AudioContext | null = null
let raf = 0
export async function startBreath() {
  if (stream) return true
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
  } catch {
    return false
  }
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  ctx = new Ctx()
  const src = ctx.createMediaStreamSource(stream)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 500
  const an = ctx.createAnalyser()
  an.fftSize = 1024
  src.connect(lp)
  lp.connect(an)
  const buf = new Float32Array(an.fftSize)
  let floor = 0.01
  const tick = () => {
    an.getFloatTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
    const rms = Math.sqrt(sum / buf.length)
    floor = Math.min(floor * 1.0005 + 0.00001, Math.max(0.004, rms * 0.98 + floor * 0.02))
    const level = Math.max(0, Math.min(1, (rms - floor * 2.5) * 14))
    live.blow += (level - live.blow) * (level > live.blow ? 0.35 : 0.06)
    if (level > 0.2) live.lastInput = performance.now()
    raf = requestAnimationFrame(tick)
  }
  tick()
  haptic(12)
  return true
}
export function stopBreath() {
  cancelAnimationFrame(raf)
  stream?.getTracks().forEach((t) => t.stop())
  ctx?.close().catch(() => {})
  stream = null
  ctx = null
  live.blow = 0
}
export function breathing() {
  return !!stream
}
