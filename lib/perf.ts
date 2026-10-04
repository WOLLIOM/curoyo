// One decision, made once: how much this device can take. 'low' = phones and older laptops (e.g. a 2016 MacBook),
// 'mid' = ordinary machines, 'high' = a proper GPU. The design never changes, only the count and the resolution.
export type Tier = 'low' | 'mid' | 'high'

let cached: Tier | null = null

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
  if (phone || cores <= 4 || mem <= 4 || (integrated && !discrete)) cached = 'low'
  else if (cores <= 6 && !discrete) cached = 'mid'
  else cached = 'high'
  return cached
}
