import { useStore } from './store'
import { listenForShake } from './phone'

type DOEvent = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }
type DMEvent = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

export function motionSupported() {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return coarse && !reduced && 'DeviceOrientationEvent' in window
}

// Must be called from a tap: iOS only grants motion access in response to a user gesture.
export async function enableMotion() {
  const D = DeviceOrientationEvent as DOEvent
  if (typeof D.requestPermission === 'function') {
    try {
      if ((await D.requestPermission()) !== 'granted') return false
    } catch {
      return false
    }
  }
  // Motion (for shake) is a separate permission on iOS; ask in the same tap, but don't require it.
  const M = typeof DeviceMotionEvent !== 'undefined' ? (DeviceMotionEvent as DMEvent) : null
  if (M && typeof M.requestPermission === 'function') {
    try {
      await M.requestPermission()
    } catch {
      // tilt still works without shake
    }
  }
  listenForShake(true)
  useStore.getState().setGyroOn(true)
  return true
}
