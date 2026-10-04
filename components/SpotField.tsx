'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MODES, live } from '@/lib/store'

// The background is made of the logo's own spots: bean shapes drifting in depth.
// They move with scroll, cursor and phone tilt at different rates, so the space has layers.

const VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uScroll;
uniform vec2 uParallax;
uniform float uPx;
varying float vAngle;
varying float vMix;
varying float vFade;

void main() {
  vec3 p = position;
  float depth = (p.z + 14.0) / 12.0;
  p.y += mod(uTime * (0.04 + aSeed.x * 0.05) + uScroll * (0.6 + depth * 1.4) + aSeed.y * 40.0, 40.0) - 20.0;
  p.x += sin(uTime * 0.07 + aSeed.z * 30.0) * 0.6;
  p.xy += uParallax * (0.4 + depth * 1.4);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPx * (0.5 + aSeed.w * 0.9) / -mv.z;
  vAngle = aSeed.x * 6.2831 + uTime * (aSeed.y - 0.5) * 0.15;
  vMix = aSeed.z;
  vFade = smoothstep(-15.0, -6.0, mv.z) * smoothstep(-1.0, -4.0, mv.z);
}
`

const FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uAlpha;
varying float vAngle;
varying float vMix;
varying float vFade;

void main() {
  vec2 q = gl_PointCoord - 0.5;
  float c = cos(vAngle);
  float s = sin(vAngle);
  q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  // A kidney-bean capsule, like the spots on the snake.
  q.y += 0.06 * cos(q.x * 6.0);
  vec2 a = vec2(-0.14, 0.0);
  vec2 b = vec2(0.14, 0.0);
  vec2 pa = q - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  float dist = length(pa - ba * h) - 0.17;
  if (dist > 0.02) discard;
  float edge = 1.0 - smoothstep(-0.01, 0.02, dist);
  gl_FragColor = vec4(mix(uColorA, uColorB, step(0.5, vMix)), edge * uAlpha * vFade);
}
`

export default function SpotField() {
  const mobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, [])
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )
  const count = mobile ? 160 : 360
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 34
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30
      pos[i * 3 + 2] = -14 + Math.random() * 11
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4))
    return g
  }, [count])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uScroll: { value: 0 },
          uParallax: { value: new THREE.Vector2() },
          uPx: { value: 900 },
          uColorA: { value: new THREE.Color(MODES.void.shadow) },
          uColorB: { value: new THREE.Color(MODES.void.accent) },
          uAlpha: { value: 0.08 },
        },
      }),
    []
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material]
  )

  const par = useRef(new THREE.Vector2())
  const tmp = useMemo(() => new THREE.Vector2(), [])
  const colA = useMemo(() => new THREE.Color(), [])
  const colB = useMemo(() => new THREE.Color(), [])

  useFrame((state, delta) => {
    const u = material.uniforms
    const dt = Math.min(delta, 0.1)
    u.uTime.value = state.clock.elapsedTime * (reduced ? 0.2 : 1)
    u.uScroll.value = live.section + live.scrollVel * 0.0006
    const px = live.pointer.active ? (live.pointer.x / state.size.width - 0.5) * 2 : 0
    const py = live.pointer.active ? (live.pointer.y / state.size.height - 0.5) * 2 : 0
    tmp.set(-(px * 0.35 + live.tilt.x * 0.9), py * 0.25 + live.tilt.y * 0.7)
    if (reduced) tmp.set(0, 0)
    par.current.lerp(tmp, 1 - Math.exp(-dt * 2))
    ;(u.uParallax.value as THREE.Vector2).copy(par.current)
    u.uPx.value = state.size.height * state.gl.getPixelRatio() * 0.55

    const th = live.theme
    colA.set(th.shadow)
    colB.set(th.accentAmt > 0 ? th.accent : th.particle)
    ;(u.uColorA.value as THREE.Color).lerp(colA, 1 - Math.exp(-dt * 2))
    ;(u.uColorB.value as THREE.Color).lerp(colB, 1 - Math.exp(-dt * 2))
    const alpha = th.name === 'Void' ? 0.07 : th.light ? 0.16 : 0.22
    u.uAlpha.value += (alpha - u.uAlpha.value) * (1 - Math.exp(-dt * 2))
  })

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />
}
