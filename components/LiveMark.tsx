'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GPUComputationRenderer, type Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { WM_RELIEF } from '@/lib/targets'
import { dataTexture, particleGeometry } from '@/lib/gl'
import { live, MODES } from '@/lib/store'

// A mark made of live matter, pinned exactly over a DOM element (the wordmark, or a headline).
// It rests flat and crisp; touch it and the glyphs inflate into a lit relief and part around you.
// Shaking the phone scatters it; blowing into the mic pushes it like wind.

const VEL_SHADER = /* glsl */ `
uniform float uDt;
uniform float uTime;
uniform float uIntro;
uniform float uStart;
uniform float uDepth;
uniform float uStiff;
uniform float uAmp;
uniform float uMouseStrength;
uniform float uShake;
uniform float uWind;
uniform vec2 uMouse;
uniform vec2 uMouseVel;
uniform sampler2D tTarget;
uniform sampler2D tBody;
uniform sampler2D tRand;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 p = texture2D(tPos, uv).xyz;
  vec3 v = texture2D(tVel, uv).xyz;
  vec4 tg = texture2D(tTarget, uv);
  vec4 body = texture2D(tBody, uv);
  vec4 rnd = texture2D(tRand, uv);

  vec3 T = tg.xyz;
  T.z += body.z * ${WM_RELIEF.toFixed(3)} * uDepth;
  T.xy += vec2(sin(uTime * 0.6 + rnd.x * 30.0), cos(uTime * 0.5 + rnd.y * 30.0)) * 0.0006 * uAmp;

  // Glyphs gather from left to right when they first come into view.
  float start = uStart + tg.w * 0.25 + rnd.w * 0.05;
  float gate = smoothstep(start, start + 0.2, uIntro);
  vec3 acc = (T - p) * uStiff * (0.7 + 0.6 * rnd.y) * gate;

  vec2 d = p.xy - uMouse;
  float f = smoothstep(0.085, 0.0, length(d)) * uMouseStrength;
  acc.xy += normalize(d + 1e-6) * f * 2.4;
  acc.xy += uMouseVel * f * 5.0;
  acc.z += f * 0.5 * (rnd.w - 0.25);

  // Shake: a burst outward. Breath: a gust from the left.
  vec3 dir = normalize(vec3(rnd.x - 0.5, rnd.y - 0.5, rnd.z - 0.4) + 1e-4);
  acc += dir * uShake * (2.0 + rnd.w * 4.0);
  acc.x += uWind * (0.6 + rnd.x * 1.4);
  acc.y += uWind * (rnd.y - 0.35) * 0.8;

  acc += (1.0 - gate) * vec3(sin(uTime * 0.3 + rnd.x * 40.0), cos(uTime * 0.27 + rnd.y * 40.0), 0.0) * 0.012;
  acc -= v * mix(1.4, 1.7 * sqrt(uStiff * (0.7 + 0.6 * rnd.y)), gate);
  v += acc * uDt;
  gl_FragColor = vec4(v, 1.0);
}
`

const POS_SHADER = /* glsl */ `
uniform float uDt;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  gl_FragColor = vec4(texture2D(tPos, uv).xyz + texture2D(tVel, uv).xyz * uDt, 1.0);
}
`

const RENDER_VERT = /* glsl */ `
attribute vec2 ref;
uniform sampler2D tPos;
uniform sampler2D tBody;
uniform sampler2D tRand;
uniform float uPx;
uniform float uDepth;
uniform vec3 uLight;
varying float vShade;

void main() {
  vec3 p = texture2D(tPos, ref).xyz;
  vec4 body = texture2D(tBody, ref);
  vec4 rnd = texture2D(tRand, ref);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uPx * (0.85 + rnd.w * 0.3);
  vec3 n = vec3(body.xy, sqrt(max(0.0, 1.0 - dot(body.xy, body.xy))));
  vec3 L = normalize(uLight - p);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float lit = 0.18 + 0.82 * max(dot(n, L), 0.0) + 0.3 * pow(max(dot(n, H), 0.0), 30.0);
  vShade = mix(1.0, lit, uDepth);
}
`

const RENDER_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uShadow;
varying float vShade;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  vec3 col = mix(uShadow, uColor, clamp(vShade, 0.0, 1.0)) + uColor * max(vShade - 1.0, 0.0);
  gl_FragColor = vec4(col, 1.0 - smoothstep(0.44, 0.5, d));
}
`

export interface MarkData {
  count: number
  pos: Float32Array
  body: Float32Array
  rand: Float32Array
  scatter: Float32Array
  fill?: number
}

interface Engine {
  gpu: GPUComputationRenderer
  pos: Variable
  vel: Variable
  target: THREE.DataTexture
  body: THREE.DataTexture
  textures: THREE.DataTexture[]
  count: number
  fill: number
}

interface Props {
  anchor: HTMLElement
  size: number
  load: (el: HTMLElement, size: number) => Promise<MarkData>
  start?: number
  onReady?: (ok: boolean) => void
  hideAnchor?: boolean
}

export default function LiveMark({ anchor, size: S, load, start = 0, onReady, hideAnchor = false }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const engine = useRef<Engine | null>(null)
  const { camera, size, gl } = useThree()
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )
  const halfFloat = useMemo(() => typeof window !== 'undefined' && (window.innerWidth < 768 || /iPad|iPhone|iPod/.test(navigator.userAgent)), [])

  const geometry = useMemo(() => particleGeometry(S), [S])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RENDER_VERT,
        fragmentShader: RENDER_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          tPos: { value: null },
          tBody: { value: null },
          tRand: { value: null },
          uPx: { value: 2 },
          uDepth: { value: 0 },
          uLight: { value: new THREE.Vector3(0, 0.1, 0.2) },
          uColor: { value: new THREE.Color(MODES.void.particle) },
          uShadow: { value: new THREE.Color(MODES.void.shadow) },
        },
      }),
    []
  )

  useEffect(() => {
    let cancelled = false
    let built: Engine | null = null
    let width = anchor.getBoundingClientRect().width
    let resizeTimer = 0

    load(anchor, S).then((data) => {
      if (cancelled) return
      const target = dataTexture(data.pos, S)
      const body = dataTexture(data.body, S)
      const rand = dataTexture(data.rand, S)
      const gpu = new GPUComputationRenderer(S, S, gl)
      if (halfFloat) gpu.setDataType(THREE.HalfFloatType)
      const pos0 = gpu.createTexture()
      ;(pos0.image.data as unknown as Float32Array).set(data.pos)
      if (!reduced) {
        // Start close to the letters, just loose, so the text wakes up where it is instead of arriving from nowhere.
        const a = pos0.image.data as unknown as Float32Array
        for (let i = 0; i < a.length; i++) a[i] += (data.scatter[i] - a[i]) * 0.1
      }
      const pos = gpu.addVariable('tPos', POS_SHADER, pos0)
      const vel = gpu.addVariable('tVel', VEL_SHADER, gpu.createTexture())
      gpu.setVariableDependencies(pos, [pos, vel])
      gpu.setVariableDependencies(vel, [pos, vel])
      pos.material.uniforms.uDt = { value: 0 }
      Object.assign(vel.material.uniforms, {
        uDt: { value: 0 },
        uTime: { value: 0 },
        uIntro: { value: reduced ? 9 : 0 },
        uStart: { value: start },
        uDepth: { value: 0 },
        uStiff: { value: 70 },
        uAmp: { value: reduced ? 0 : 1 },
        uMouseStrength: { value: 0 },
        uShake: { value: 0 },
        uWind: { value: 0 },
        uMouse: { value: new THREE.Vector2(9, 9) },
        uMouseVel: { value: new THREE.Vector2() },
        tTarget: { value: target },
        tBody: { value: body },
        tRand: { value: rand },
      })
      if (gpu.init()) {
        gpu.dispose()
        ;[target, body, rand].forEach((t) => t.dispose())
        onReady?.(false)
        return
      }
      material.uniforms.tBody.value = body
      material.uniforms.tRand.value = rand
      built = { gpu, pos, vel, target, body, textures: [target, body, rand], count: data.count, fill: data.fill ?? 0.5 }
      engine.current = built
      if (hideAnchor) anchor.style.opacity = '0'
      onReady?.(true)
    })

    // If the layout reflows (rotation, resize), the glyphs re-measure and the matter flows to the new shape.
    const ro = new ResizeObserver(() => {
      const w = anchor.getBoundingClientRect().width
      if (!built || Math.abs(w - width) / Math.max(1, width) < 0.06) return
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        width = w
        load(anchor, S).then((data) => {
          if (cancelled || !built) return
          ;(built.target.image.data as unknown as Float32Array).set(data.pos)
          built.target.needsUpdate = true
          ;(built.body.image.data as unknown as Float32Array).set(data.body)
          built.body.needsUpdate = true
          built.fill = data.fill ?? built.fill
        })
      }, 250)
    })
    ro.observe(anchor)

    return () => {
      cancelled = true
      ro.disconnect()
      window.clearTimeout(resizeTimer)
      if (hideAnchor) anchor.style.opacity = ''
      if (built) {
        built.gpu.dispose()
        built.textures.forEach((t) => t.dispose())
      }
      engine.current = null
    }
  }, [S, gl, material, reduced, halfFloat, anchor, load, start, onReady, hideAnchor])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material]
  )

  const mouse = useMemo(() => new THREE.Vector2(9, 9), [])
  const prev = useMemo(() => new THREE.Vector2(9, 9), [])
  const mouseVel = useMemo(() => new THREE.Vector2(), [])
  const raw = useMemo(() => new THREE.Vector2(), [])
  const light = useMemo(() => new THREE.Vector3(0, 0.1, 0.2), [])
  const lightTarget = useMemo(() => new THREE.Vector3(), [])
  const col = useMemo(() => new THREE.Color(), [])
  const st = useRef({ sim: 0, depth: 0, msk: 0 })

  useFrame((state, delta) => {
    // A bad frame time (clock hiccup, resumed tab) must never reach the physics.
    delta = delta > 0 && delta < 1 ? delta : 1 / 60
    const g = groupRef.current
    const e = engine.current
    if (!g || !e) return
    if (start > 0 && !live.go) return
    const s = st.current

    // Sit exactly where the element sits in the page, so it scrolls and resizes with the layout.
    const r = anchor.getBoundingClientRect()
    const cam = camera as THREE.PerspectiveCamera
    const perPx = (2 * cam.position.z * Math.tan((cam.fov * Math.PI) / 360)) / size.height
    g.position.set((r.left + r.width / 2 - size.width / 2) * perPx, -(r.top + r.height / 2 - size.height / 2) * perPx, 0.5)
    g.scale.setScalar(Math.max(r.width, 1) * perPx)
    // The live headline leans in 3D with the phone, inside the GPU, so the page never has to restyle.
    g.rotation.y += (live.tilt.x * 0.3 - g.rotation.y) * 0.2
    g.rotation.x += (-live.tilt.y * 0.22 - g.rotation.x) * 0.2
    g.visible = r.bottom > -40 && r.top < size.height + 40
    if (!g.visible) return

    const steps = Math.min(4, Math.max(1, Math.ceil(delta / (1 / 30))))
    const sdt = Math.min(delta / steps, 1 / 30)
    const dt = Math.min(delta, 1 / 30)
    s.sim += sdt * steps

    const px = live.pointer.x
    const py = live.pointer.y
    const pad = 28
    const inside = live.pointer.active && px > r.left - pad && px < r.right + pad && py > r.top - pad && py < r.bottom + pad
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    mouse.set((px - cx) / r.width, -(py - cy) / r.width)
    if (prev.x > 8) prev.copy(mouse)
    raw.set((mouse.x - prev.x) / Math.max(dt, 1e-3), (mouse.y - prev.y) / Math.max(dt, 1e-3))
    prev.copy(mouse)
    mouseVel.lerp(raw, 0.3)
    if (mouseVel.length() > 1.2) mouseVel.setLength(1.2)

    // Tilting the phone also raises the relief: the glyphs show their depth as you turn them.
    const tilt = Math.min(1, Math.hypot(live.tilt.x, live.tilt.y) * 1.6)
    const on = reduced ? 0 : Math.max(inside ? 1 : 0, tilt)
    s.depth += (on - s.depth) * (1 - Math.exp(-dt * (on ? 3 : 1.6)))
    s.msk += ((inside && !reduced ? 1 : 0) - s.msk) * (1 - Math.exp(-dt * 5))

    const time = state.clock.elapsedTime
    if (inside) lightTarget.set(mouse.x, mouse.y, 0.12)
    else lightTarget.set(Math.cos(time * 0.3) * 0.4 + live.tilt.x * 0.5, 0.1 - live.tilt.y * 0.3, 0.18)
    light.lerp(lightTarget, 1 - Math.exp(-dt * 4))

    const vu = e.vel.material.uniforms
    vu.uDt.value = sdt
    e.pos.material.uniforms.uDt.value = sdt
    vu.uTime.value = time
    vu.uIntro.value = reduced ? 9 : s.sim / 0.8
    vu.uDepth.value = s.depth
    vu.uMouseStrength.value = s.msk
    vu.uShake.value = reduced ? 0 : live.shake
    vu.uWind.value = reduced ? 0 : live.blow * 0.35
    ;(vu.uMouse.value as THREE.Vector2).copy(mouse)
    ;(vu.uMouseVel.value as THREE.Vector2).copy(mouseVel)
    for (let n = 0; n < steps; n++) e.gpu.compute()

    const ru = material.uniforms
    ru.tPos.value = e.gpu.getCurrentRenderTarget(e.pos).texture
    ru.uDepth.value = s.depth
    ru.uLight.value.copy(light)
    const th = live.theme
    col.set(th.particle)
    ;(ru.uColor.value as THREE.Color).lerp(col, 1 - Math.exp(-dt * 2))
    col.set(th.shadow)
    ;(ru.uShadow.value as THREE.Color).lerp(col, 1 - Math.exp(-dt * 2))
    // Grain size from the on-screen ink area, so glyphs always read as solid.
    const spacing = Math.sqrt((r.width * r.height * Math.max(0.12, e.fill)) / e.count)
    ru.uPx.value = Math.max(1.5, spacing * 2.1) * gl.getPixelRatio()
  })

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}
