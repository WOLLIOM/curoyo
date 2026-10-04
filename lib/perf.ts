// One decision, made once: how much this device can take. 'low' = phones and older laptops (e.g. a 2016 MacBook),
// 'mid' = ordinary machines, 'high' = a proper GPU. The design never changes, only the count and the resolution.
export type Tier = 'low' | 'mid' | 'high'

let cached: Tier | null = null
let liteCached: boolean | null = null

// 'lite' goes one step further than 'low': very small machines, data-saver users, or ?lite in the address.
// ?full forces the full experience (and ignores the guess), ?lite forces the lightest one.
export function lite(): boolean {
  if (liteCached !== null) return liteCached
  if (typeof window === 'undefined') return false
  const q = new URLSearchParams(window.location.search)
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  liteCached = q.has('full') ? false : q.has('lite') || (nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency || 4) <= 2 || !!nav.connection?.saveData
  return liteCached
}

export function tier(): Tier {
  if (cached) return cached
  if (typeof window === 'undefined') return 'mid'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const phone = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(nav.userAgent)
  const cores = nav.hardwareConcurrency || 4
  const mem = nav.deviceMemory || 8
  let gpu = ''
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl') || c.getContext('experimental-webgl')) as WebGLRenderingContext | null
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    if (gl && ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    // unknown GPU: fall back to cores and memory
  }
  const integrated = /Intel|HD Graphics|Iris|UHD|SwiftShader|llvmpipe|Software|Mali-[GT]?[34]/i.test(gpu)
  const discrete = /NVIDIA|GeForce|RTX|GTX|Radeon (RX|Pro)|Apple M|Apple GPU/i.test(gpu)
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('full')) cached = 'high'
  else if (lite() || phone || cores <= 4 || mem <= 4 || (integrated && !discrete)) cached = 'low'
  else if (cores <= 6 && !discrete) cached = 'mid'
  else cached = 'high'
  return cached
}
