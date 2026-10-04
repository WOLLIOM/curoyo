'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GPUComputationRenderer, type Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { BAMBOO_BASE, BAMBOO_SPAN, buildCore, buildFormation, CRADLE_PIVOT_Y, type FormationName } from '@/lib/targets'
import { dataTexture, particleGeometry } from '@/lib/gl'
import { MODES, live, useStore } from '@/lib/store'
import { sound } from '@/lib/sound'
import { lite, tier } from '@/lib/perf'

// ---------- GPU simulation: every particle is a mass on a spring, pulled toward its formation ----------

const VEL_SHADER = /* glsl */ `
uniform float uDt;
uniform float uTime;
uniform float uIntro;
uniform float uTrans;
uniform float uDepth;
uniform float uAmp;
uniform float uFall;
uniform float uSwallow;
uniform float uPulse;
uniform float uStiff;
uniform float uMouseStrength;
uniform vec2 uMouse;
uniform vec2 uMouseVel;
uniform vec4 uW;
uniform vec4 uW2;
uniform vec4 uW3;
uniform float uPivotY;
uniform float uShake;
uniform float uWind;
uniform float uGrow;
uniform vec2 uGrav;
uniform float uWire;
uniform sampler2D tBamboo;
uniform sampler2D tPeaks;
uniform sampler2D tCradle;
uniform sampler2D tNCradle;
uniform sampler2D tSnake;
uniform sampler2D tRing;
uniform sampler2D tApple;
uniform sampler2D tOrbit;
uniform sampler2D tCloud;
uniform sampler2D tGalaxy;
uniform sampler2D tTree;
uniform sampler2D tPortrait;
uniform sampler2D tBody;
uniform sampler2D tRand;

// The wireframe world: lines of a building, a product, a room and a landscape, drawn by the same matter.
// Every grain sits on one line of the current shape; r1..r3 choose the line and the spot along it.
vec3 wireBuilding(vec3 r) {
  if (r.z < 0.38) {
    float c = floor(r.x * 9.0);
    return vec3((mod(c, 3.0) - 1.0) * 1.1, (r.y - 0.5) * 5.4, (floor(c / 3.0) - 1.0) * 1.1);
  }
  float f = floor(r.x * 12.0);
  float u = fract(r.x * 12.0 + r.z * 7.0) * 4.0;
  float side = floor(u);
  float q = (fract(u) - 0.5) * 2.2;
  vec2 xz = side < 1.0 ? vec2(q, -1.1) : side < 2.0 ? vec2(1.1, q) : side < 3.0 ? vec2(-q, 1.1) : vec2(-1.1, -q);
  return vec3(xz.x, -2.7 + f * 0.5 + r.y * 0.0, xz.y);
}
float wireProfile(float y) { return 0.85 + 0.65 * sin(y * 0.9 + 0.7) * (1.0 - 0.15 * y * y * 0.2); }
vec3 wireProduct(vec3 r) {
  if (r.z < 0.6) {
    float l = floor(r.x * 16.0);
    float y = -2.3 + l * 0.3;
    float a = r.y * 6.2831;
    float rad = wireProfile(y);
    return vec3(cos(a) * rad, y, sin(a) * rad);
  }
  float m = floor(r.x * 14.0);
  float a = m / 14.0 * 6.2831;
  float y = (r.y - 0.5) * 4.6;
  float rad = wireProfile(y);
  return vec3(cos(a) * rad, y, sin(a) * rad);
}
vec3 wireRoom(vec3 r) {
  float k = r.z;
  if (k < 0.4) {
    float l = floor(r.x * 13.0);
    float t = (r.y - 0.5) * 2.0;
    return r.x > 0.5 ? vec3(-3.0 + l * 0.5, -1.5, t * 2.0) : vec3(t * 3.0, -1.5, -2.0 + (l - 6.0) * 0.5 + 1.0);
  }
  if (k < 0.7) {
    float e = floor(r.x * 8.0);
    float t = r.y;
    vec3 a = vec3(e < 4.0 ? -3.0 : 3.0, -1.5, mod(e, 2.0) < 1.0 ? -2.0 : 2.0);
    float up = (mod(e, 4.0) < 2.0) ? 1.0 : 0.0;
    return up > 0.5 ? a + vec3(0.0, t * 3.4, 0.0) : mix(a, vec3(-a.x, a.y, a.z), t);
  }
  float b = floor(r.x * 12.0);
  float t = r.y;
  vec3 c = vec3(-0.9, -1.5, -0.2);
  vec3 sz = vec3(1.8, 0.9, 0.9);
  vec3 o = vec3(mod(b, 2.0), floor(mod(b / 2.0, 2.0)), floor(b / 4.0) < 1.0 ? 0.0 : floor(b / 4.0) < 2.0 ? 1.0 : 0.5);
  float ax = floor(b / 4.0);
  vec3 q = c + sz * o;
  if (ax < 1.0) q.x = c.x + sz.x * t; else if (ax < 2.0) q.y = c.y + sz.y * t; else q.z = c.z + sz.z * t;
  return q;
}
float wireH(float x, float z) { return (sin(x * 0.9 + 1.0) * cos(z * 1.3) + sin(x * 0.33 - z * 0.7) * 1.3) * 0.42; }
vec3 wireWorld(vec3 r) {
  float line = floor(r.x * 26.0);
  float t = r.y;
  float x;
  float z;
  if (r.z < 0.5) { z = -3.2 + mod(line, 13.0) * 0.5; x = (t - 0.5) * 11.5; }
  else { x = -5.5 + mod(line, 24.0) * 0.5; z = (t - 0.5) * 6.4; }
  float h = wireH(x, z);
  return vec3(x, h - 0.5 + z * 0.5, z * 0.6);
}
vec3 wireAt(vec3 r, float st) {
  vec3 a = wireBuilding(r);
  vec3 b = wireProduct(r);
  vec3 c = wireRoom(r);
  vec3 d = wireWorld(r);
  float m1 = smoothstep(0.0, 1.0, clamp(st, 0.0, 1.0));
  float m2 = smoothstep(0.0, 1.0, clamp(st - 1.0, 0.0, 1.0));
  float m3 = smoothstep(0.0, 1.0, clamp(st - 2.0, 0.0, 1.0));
  return mix(mix(mix(a, b, m1), c, m2), d, m3);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 p = texture2D(tPos, uv).xyz;
  vec3 v = texture2D(tVel, uv).xyz;
  vec4 sn = texture2D(tSnake, uv);
  vec4 body = texture2D(tBody, uv);
  vec4 rnd = texture2D(tRand, uv);
  vec3 apple = texture2D(tApple, uv).xyz;

  // Newton's cradle: the end balls swing out in turn; the rest hang still.
  vec4 cr = texture2D(tCradle, uv);
  float tag = cr.w;
  float ph = sin(uTime * 2.4);
  float ang = (tag < 0.5 ? max(ph, 0.0) : (tag > 3.5 && tag < 4.5 ? -max(-ph, 0.0) : 0.0)) * 0.7;
  vec2 pv = vec2(texture2D(tNCradle, uv).w, uPivotY);
  vec2 rel = cr.xy - pv;
  vec3 crT = vec3(pv + vec2(cos(ang) * rel.x + sin(ang) * rel.y, -sin(ang) * rel.x + cos(ang) * rel.y), cr.z);

  // Bamboo grows from the ground up: anything above the growing tip gathers into the bright shoot of its culm,
  // and the canes sway more the higher they reach.
  vec4 bb = texture2D(tBamboo, uv);
  float ci = floor(bb.w);
  float bh = fract(bb.w);
  vec3 bT = bb.xyz;
  float tipY = ${BAMBOO_BASE.toFixed(2)} + uGrow * ${BAMBOO_SPAN.toFixed(2)};
  if (bT.y > tipY) {
    float lean = (ci - 2.0) * 0.06 * (tipY + ${(-BAMBOO_BASE).toFixed(2)}) * (tipY + ${(-BAMBOO_BASE).toFixed(2)}) * 0.12;
    bT = vec3(-2.6 + ci * 1.3 + lean + (rnd.x - 0.5) * 0.25, tipY + rnd.y * 0.18, bT.z * 0.3);
  }
  float sw = bh * bh;
  bT.x += (sin(uTime * 0.9 + ci * 1.7) * 0.16 + sin(uTime * 2.3 + ci) * 0.03) * sw + uWind * sw * 0.8;
  bT.z += cos(uTime * 0.7 + ci * 2.1) * 0.08 * sw;

  vec3 T = sn.xyz * uW.x
         + texture2D(tRing, uv).xyz * uW.y
         + apple * uW.z
         + texture2D(tOrbit, uv).xyz * uW.w
         + texture2D(tCloud, uv).xyz * uW2.x
         + texture2D(tGalaxy, uv).xyz * uW2.y
         + texture2D(tTree, uv).xyz * uW2.z
         + texture2D(tPortrait, uv).xyz * uW2.w
         + bT * uW3.x
         + crT * uW3.y
         + texture2D(tPeaks, uv).xyz * uW3.z
         + wireAt(vec3(rnd.x, fract(rnd.y * 97.0 + rnd.x * 13.0), rnd.z), uWire) * uW3.w;

  // The apple is taken into the body head first, following the real path of the snake.
  if (uSwallow >= 0.0) {
    float d0 = (1.0 - sn.w) * 0.55;
    float m = smoothstep(d0, d0 + 0.45, uSwallow);
    T = mix(apple, sn.xyz, m);
    T.y += sin(m * 3.14159) * 0.45 * (0.4 + rnd.z);
  }
  T.y += uFall * uW.z;

  // The flat mark inflates into a rounded, cast-like body. Spots become dimples.
  T.z += body.z * 0.5 * uDepth * uW.x;

  // Barely-there life.
  T.xy += vec2(sin(uTime * 0.6 + rnd.x * 30.0), cos(uTime * 0.5 + rnd.y * 30.0)) * 0.008 * uAmp;
  T.y += sin(T.x * 0.9 - uTime * 0.55) * 0.035 * uW.x * uAmp * uDepth;

  // Matter reorganising between forms: a soft drift, not an explosion.
  float a = rnd.x * 6.2831 + uTime * 0.1;
  T += vec3(cos(a), sin(a * 1.3), sin(a * 0.7)) * uTrans * (0.3 + rnd.z * 1.2);

  T.xy *= 1.0 + 0.03 * uPulse;

  // Intro: dust gathers into the snake from the tail to the head.
  float start = sn.w * 1.0 + rnd.w * 0.12;
  float gate = smoothstep(start, start + 0.35, uIntro);
  float k = uStiff * (0.85 + 0.3 * rnd.y) * gate;
  vec3 acc = (T - p) * k;

  // Cursor: a pressure field that parts the matter, plus drag, like a hand through water.
  vec2 d = p.xy - uMouse;
  float dist = length(d);
  float f = smoothstep(1.35, 0.0, dist) * uMouseStrength;
  acc.xy += normalize(d + 1e-5) * f * 26.0;
  acc.xy += uMouseVel * f * 5.0;
  acc.z += f * 7.0 * (rnd.w - 0.25);
  // Fur: each grain is a strand that flicks sideways as the cursor combs through, then springs back.
  acc.xy += vec2(-d.y, d.x) / (dist + 0.05) * f * (rnd.x - 0.5) * 9.0 * (0.4 + length(uMouseVel) * 0.15);

  // Shake the phone: the matter bursts outward and finds its way back. Blow on it: a gust from the left.
  vec3 sdir = normalize(vec3(rnd.x - 0.5, rnd.y - 0.5, rnd.z - 0.4) + 1e-4);
  acc += sdir * uShake * (25.0 + rnd.w * 45.0);
  acc.x += uWind * (6.0 + rnd.x * 14.0);
  acc.y += uWind * (rnd.y - 0.35) * 8.0;
  // Tilt the phone: the matter leans and slides with gravity, each grain by its own weight.
  acc.xy += uGrav * (5.0 + rnd.z * 9.0);

  // Before its turn, a particle floats as dust.
  acc += (1.0 - gate) * vec3(sin(uTime * 0.3 + rnd.x * 40.0), cos(uTime * 0.27 + rnd.y * 40.0), 0.0) * 0.12;
  acc -= v * mix(1.4, 1.7 * sqrt(max(k, 1.0)), gate);

  v += acc * uDt;
  gl_FragColor = vec4(v, 1.0);
}
`

const POS_SHADER = /* glsl */ `
uniform float uDt;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 p = texture2D(tPos, uv).xyz;
  vec3 v = texture2D(tVel, uv).xyz;
  gl_FragColor = vec4(p + v * uDt, 1.0);
}
`

// ---------- Rendering: crisp grains, lit like a sculpted surface once the logo gains depth ----------

const RENDER_VERT = /* glsl */ `
attribute vec2 ref;
uniform sampler2D tPos;
uniform sampler2D tBody;
uniform sampler2D tRand;
uniform sampler2D tNApple;
uniform sampler2D tNOrbit;
uniform sampler2D tNCloud;
uniform sampler2D tNTree;
uniform sampler2D tNBamboo;
uniform sampler2D tNPeaks;
uniform sampler2D tNCradle;
uniform sampler2D tNRing;
uniform sampler2D tPortrait;
uniform vec4 uW;
uniform vec4 uW2;
uniform vec4 uW3;
uniform float uTime;
uniform float uSize;
uniform float uDim;
uniform float uDepth;
uniform float uPulse;
uniform float uAccentAmt;
uniform vec3 uLight;
varying float vShade;
varying float vAccent;
varying float vAlpha;

void main() {
  vec3 p = texture2D(tPos, ref).xyz;
  vec4 body = texture2D(tBody, ref);
  vec4 rnd = texture2D(tRand, ref);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  // Surface normal of whatever the particles are forming right now.
  float bodyW = uW.x;
  float objW = uW.y + uW.z + uW.w + uW2.x + uW2.z + uW3.x + uW3.y + uW3.z;
  vec3 nBody = vec3(body.xy, sqrt(max(0.0, 1.0 - dot(body.xy, body.xy))));
  vec3 nObj = texture2D(tNApple, ref).xyz * uW.z + texture2D(tNOrbit, ref).xyz * uW.w + texture2D(tNCloud, ref).xyz * uW2.x + texture2D(tNTree, ref).xyz * uW2.z + texture2D(tNBamboo, ref).xyz * uW3.x + texture2D(tNCradle, ref).xyz * uW3.y + texture2D(tNPeaks, ref).xyz * uW3.z + texture2D(tNRing, ref).xyz * uW.y;
  vec3 n = normalize(nBody * bodyW * max(uDepth, 0.02) + nObj + vec3(0.0, 0.0, 1e-3));

  vec3 L = normalize(uLight - p);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float lambert = max(dot(n, L), 0.0);
  float spec = pow(max(dot(n, H), 0.0), 30.0);
  float lit = 0.18 + 0.82 * lambert + 0.3 * spec;
  vShade = mix(1.0, lit, clamp(uDepth * bodyW + objW, 0.0, 1.0));

  // Stars: varied sizes, a slow twinkle.
  float tw = 0.55 + 0.45 * sin(uTime * (0.8 + rnd.x * 1.6) + rnd.y * 60.0);
  vShade = mix(vShade, tw * (0.75 + rnd.z * 0.5), uW2.y);
  // Portrait: each grain carries the brightness of the photograph at its spot.
  vShade = mix(vShade, 0.3 + texture2D(tPortrait, ref).w * 0.85, uW2.w);
  vShade *= mix(1.0, smoothstep(-9.0, 1.5, p.z), 0.5);

  float size = (0.85 + rnd.w * 0.3) * mix(1.0, 0.45 + pow(rnd.w, 3.0) * 2.2, uW2.y);
  gl_PointSize = uSize * size * (1.0 + uPulse * 0.25) / -mv.z;

  vAccent = step(rnd.z, uAccentAmt);
  vAlpha = uDim;
}
`

const RENDER_FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uShadow;
varying float vShade;
varying float vAccent;
varying float vAlpha;

// Shading runs from the theme's shadow colour to its particle colour, so relief never turns grey.
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = 1.0 - smoothstep(0.34, 0.5, d);
  vec3 lit = mix(uColorA, uColorB, vAccent);
  vec3 col = mix(uShadow, lit, clamp(vShade, 0.0, 1.0)) + lit * max(vShade - 1.0, 0.0);
  gl_FragColor = vec4(col, a * vAlpha);
}
`

interface Room {
  x: number
  y: number
  s: number
  rz: number
  dim: number
  target: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
  drop?: number
}

// Targets: 0 panda, 1 spaces (a pavilion; the snake's ring until it loads), 2 apple, 3 planet, 4 clouds, 5 galaxy, 6 tree, 7 portrait, 8 bamboo, 9 Newton's cradle, 10 Himalaya, 11 wireframe world.
// Sections: intro, eden, newton, idea, form, work, studio, beyond, panda, play, pricing, about, credentials, contact.
const ROOMS_DESKTOP: Room[] = [
  { x: 0, y: 1.25, s: 0.8, rz: 0, dim: 1, target: 0 },
  { x: 0, y: 1.0, s: 0.82, rz: 0, dim: 1, target: 6 },
  { x: 0, y: 1.15, s: 0.72, rz: 0, dim: 1, target: 9 },
  { x: 0, y: 0.8, s: 1, rz: 0, dim: 0.85, target: 4 },
  { x: 0, y: 1.25, s: 0.8, rz: 0, dim: 1, target: 0 },
  { x: 0, y: 0.2, s: 1, rz: 0, dim: 0.3, target: 11 },
  { x: 0, y: 0.25, s: 0.85, rz: 0, dim: 0.42, target: 1 },
  { x: 0, y: 0.45, s: 0.9, rz: 0, dim: 0.9, target: 5 },
  { x: 3.3, y: 0.2, s: 0.85, rz: 0, dim: 1, target: 8 },
  { x: 0, y: 0, s: 1.05, rz: 0, dim: 0.07, target: 5 },
  { x: 3.5, y: 0.1, s: 0.8, rz: 0, dim: 1, target: 6 },
  { x: 0, y: 0.8, s: 1.1, rz: 0, dim: 1, target: 7 },
  { x: 0, y: 0.4, s: 1.15, rz: 0, dim: 0.08, target: 4 },
  { x: 0, y: 0.9, s: 0.95, rz: 0, dim: 0.85, target: 10 },
]
const ROOMS_STACKED: Room[] = [
  { x: 0, y: 1.7, s: 0.9, rz: 0, dim: 1, target: 0 },
  { x: 0, y: 1.35, s: 1.1, rz: 0, dim: 0.9, target: 6 },
  { x: 0, y: 1.5, s: 1.3, rz: 0, dim: 0.9, target: 9 },
  { x: 0, y: 1.5, s: 1.1, rz: 0, dim: 0.5, target: 4 },
  { x: 0, y: 1.1, s: 1.0, rz: 0, dim: 1, target: 0 },
  { x: 0, y: 1.4, s: 1.1, rz: 0, dim: 0.3, target: 11 },
  { x: 0, y: 1.2, s: 0.72, rz: 0, dim: 0.4, target: 1 },
  { x: 0, y: 1.2, s: 1.15, rz: 0, dim: 0.5, target: 5 },
  { x: 0, y: 1.9, s: 0.9, rz: 0, dim: 0.75, target: 8 },
  { x: 0, y: 1.2, s: 1.1, rz: 0, dim: 0.14, target: 5 },
  { x: 0, y: 1.5, s: 1.0, rz: 0, dim: 0.85, target: 6 },
  { x: 0, y: 2.1, s: 1.3, rz: 0, dim: 1, target: 7 },
  { x: 0, y: 1.5, s: 1.1, rz: 0, dim: 0.14, target: 4 },
  { x: 0, y: 1.6, s: 0.9, rz: 0, dim: 0.7, target: 10 },
]

// The pricing room shows the chosen plan: an apple, a tree, a planet, a galaxy.
const PRICING_ROOM = 10
const PLAN_TARGET: Room['target'][] = [3, 11, 5, 4]

function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

interface Engine {
  gpu: GPUComputationRenderer | null
  pos: Variable | null
  vel: Variable | null
  textures: THREE.DataTexture[]
  since?: number
}

export default function Particles() {
  const groupRef = useRef<THREE.Group>(null)
  const engine = useRef<Engine | null>(null)
  const { camera, size, viewport, gl } = useThree()
  const mobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, [])
  const level = useMemo(() => tier(), [])
  const weak = level === 'low'
  const S = lite() ? 80 : mobile ? 96 : weak ? 128 : level === 'mid' ? 160 : 192
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const geometry = useMemo(() => particleGeometry(S), [S])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RENDER_VERT,
        fragmentShader: RENDER_FRAG,
        transparent: true,
        depthWrite: true,
        uniforms: {
          tPos: { value: null },
          tBody: { value: null },
          tRand: { value: null },
          tNApple: { value: null },
          tNOrbit: { value: null },
          tNCloud: { value: null },
          tNTree: { value: null },
          tNBamboo: { value: null },
          tNPeaks: { value: null },
          tNCradle: { value: null },
          tNRing: { value: null },
          tPortrait: { value: null },
          uW3: { value: new THREE.Vector4() },
          uW: { value: new THREE.Vector4(1, 0, 0, 0) },
          uW2: { value: new THREE.Vector4() },
          uTime: { value: 0 },
          uSize: { value: 30 },
          uDim: { value: 1 },
          uDepth: { value: 0 },
          uPulse: { value: 0 },
          uAccentAmt: { value: 0 },
          uLight: { value: new THREE.Vector3(0, 2, 3) },
          uColorA: { value: new THREE.Color(MODES.void.ink) },
          uColorB: { value: new THREE.Color(MODES.void.accent) },
          uShadow: { value: new THREE.Color(MODES.void.shadow) },
        },
      }),
    []
  )

  useEffect(() => {
    let cancelled = false
    let built: Engine | null = null
    const timers: number[] = []
    buildCore(S).then((core) => {
      if (cancelled) return
      const blank = () => dataTexture(new Float32Array(S * S * 4), S)
      const tex = {
        snake: dataTexture(core.snake, S),
        body: dataTexture(core.body, S),
        ring: dataTexture(core.ring, S),
        nRing: blank(),
        rand: dataTexture(core.rand, S),
        apple: blank(),
        nApple: blank(),
        tree: blank(),
        nTree: blank(),
        bamboo: blank(),
        nBamboo: blank(),
        peaks: blank(),
        nPeaks: blank(),
        cradle: blank(),
        nCradle: blank(),
        orbit: blank(),
        nOrbit: blank(),
        cloud: blank(),
        nCloud: blank(),
        galaxy: blank(),
        portrait: blank(),
      }
      const textures = Object.values(tex)

      const gpu = new GPUComputationRenderer(S, S, gl)
      if (weak || mobile || /iPad|iPhone|iPod/.test(navigator.userAgent)) gpu.setDataType(THREE.HalfFloatType)
      const pos0 = gpu.createTexture()
      ;(pos0.image.data as unknown as Float32Array).set(reduced ? core.snake : core.scatter)
      const vel0 = gpu.createTexture()
      const pos = gpu.addVariable('tPos', POS_SHADER, pos0)
      const vel = gpu.addVariable('tVel', VEL_SHADER, vel0)
      gpu.setVariableDependencies(pos, [pos, vel])
      gpu.setVariableDependencies(vel, [pos, vel])
      pos.material.uniforms.uDt = { value: 0 }
      Object.assign(vel.material.uniforms, {
        uDt: { value: 0 },
        uTime: { value: 0 },
        uIntro: { value: reduced ? 9 : 0 },
        uTrans: { value: 0 },
        uDepth: { value: 0 },
        uAmp: { value: reduced ? 0.2 : 1 },
        uFall: { value: 0 },
        uSwallow: { value: -1 },
        uPulse: { value: 0 },
        uStiff: { value: 95 },
        uMouseStrength: { value: 0 },
        uMouse: { value: new THREE.Vector2(99, 99) },
        uMouseVel: { value: new THREE.Vector2() },
        uW: { value: new THREE.Vector4(1, 0, 0, 0) },
        uW2: { value: new THREE.Vector4() },
        uW3: { value: new THREE.Vector4() },
        uPivotY: { value: CRADLE_PIVOT_Y },
        uShake: { value: 0 },
        uWind: { value: 0 },
        uGrow: { value: reduced ? 1 : 0 },
        uWire: { value: 0 },
        uGrav: { value: new THREE.Vector2() },
        tSnake: { value: tex.snake },
        tRing: { value: tex.ring },
        tApple: { value: tex.apple },
        tOrbit: { value: tex.orbit },
        tCloud: { value: tex.cloud },
        tGalaxy: { value: tex.galaxy },
        tTree: { value: tex.tree },
        tPortrait: { value: tex.portrait },
        tBamboo: { value: tex.bamboo },
        tPeaks: { value: tex.peaks },
        tCradle: { value: tex.cradle },
        tNCradle: { value: tex.nCradle },
        tBody: { value: tex.body },
        tRand: { value: tex.rand },
      })

      const err = gpu.init()
      const mu = material.uniforms
      mu.tBody.value = tex.body
      mu.tRand.value = tex.rand
      mu.tNApple.value = tex.nApple
      mu.tNOrbit.value = tex.nOrbit
      mu.tNCloud.value = tex.nCloud
      mu.tNTree.value = tex.nTree
      mu.tNBamboo.value = tex.nBamboo
      mu.tNPeaks.value = tex.nPeaks
      mu.tNCradle.value = tex.nCradle
      mu.tNRing.value = tex.nRing
      mu.tPortrait.value = tex.portrait
      if (err) {
        // No float render targets: show the measured snake without the simulation.
        console.warn("CUROYO: GPU simulation unavailable, showing the static form.", err)
        gpu.dispose()
        mu.tPos.value = tex.snake
        built = { gpu: null, pos: null, vel: null, textures }
      } else {
        built = { gpu, pos, vel, textures }
      }
      engine.current = built
      built.since = performance.now()

      // Everything the visitor will meet later loads quietly in the background, nearest first.
      if (!built.gpu) return
      const fill = (name: FormationName, t: THREE.DataTexture, n?: THREE.DataTexture) =>
        buildFormation(name, S).then((f) => {
          if (cancelled) return
          ;(t.image.data as unknown as Float32Array).set(f.pos)
          t.needsUpdate = true
          if (n && f.nrm) {
            ;(n.image.data as unknown as Float32Array).set(f.nrm)
            n.needsUpdate = true
          }
        })
      const jobs: [FormationName, THREE.DataTexture, THREE.DataTexture?][] = [
        ['tree', tex.tree, tex.nTree],
        ['cradle', tex.cradle, tex.nCradle],
        ['apple', tex.apple, tex.nApple],
        ['orbit', tex.orbit, tex.nOrbit],
        ['bamboo', tex.bamboo, tex.nBamboo],
        ['peaks', tex.peaks, tex.nPeaks],
        ['spaces', tex.ring, tex.nRing],
        ['galaxy', tex.galaxy],
        ['portrait', tex.portrait],
        ['cloud', tex.cloud, tex.nCloud],
      ]
      // Each build is a burst of main-thread work, so they run one at a time, only when the browser is idle,
      // and (on phones) well after the hero has settled, so the intro and first scroll stay smooth.
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      // The pavilion is the heaviest object: phones keep the light ring there instead of building it.
      const list = weak ? jobs.filter(([name]) => name !== 'spaces') : jobs
      list.forEach(([name, t, n], i) => {
        const run = () => void fill(name, t, n)
        const delay = weak ? 3500 + i * 1100 : 700 + i * 350
        timers.push(window.setTimeout(() => (ric ? ric(run, { timeout: 2500 }) : run()), delay))
      })
    })
    return () => {
      cancelled = true
      timers.forEach((id) => window.clearTimeout(id))
      if (built) {
        built.gpu?.dispose()
        built.textures.forEach((t) => t.dispose())
      }
      engine.current = null
    }
  }, [S, gl, material, mobile, weak, reduced])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material]
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      live.pointer.x = e.clientX
      live.pointer.y = e.clientY
      live.pointer.active = true
      live.interacted = true
      live.lastInput = performance.now()
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') live.pointer.active = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--intro', reduced ? '1' : '0')
    return () => {
      document.documentElement.style.setProperty('--intro', '1')
    }
  }, [reduced])

  const tmp = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const local = useMemo(() => new THREE.Vector3(), [])
  const prevLocal = useMemo(() => new THREE.Vector2(99, 99), [])
  const mouseVel = useMemo(() => new THREE.Vector2(), [])
  const rawVel = useMemo(() => new THREE.Vector2(), [])
  const light = useMemo(() => new THREE.Vector3(0, 2, 3), [])
  const lightTarget = useMemo(() => new THREE.Vector3(), [])
  const colA = useMemo(() => new THREE.Color(), [])
  const colB = useMemo(() => new THREE.Color(), [])
  const colS = useMemo(() => new THREE.Color(), [])
  const wT = useMemo(() => new THREE.Vector4(), [])
  const wT2 = useMemo(() => new THREE.Vector4(), [])
  const wT3 = useMemo(() => new THREE.Vector4(), [])
  const state0 = useRef({ sim: 0, lastIntroVar: -1, depth: 0, pulse: 0, rotX: 0, rotY: 0, msk: 0, grow: 0, wire: 0, lastS: 0, idle: 0, settle: 0 })

  useFrame((state, delta) => {
    const g = groupRef.current
    const e = engine.current
    if (!g || !e) return
    const st = state0.current
    // Fixed-size physics steps; when frames drop, take a few catch-up steps so motion stays physical.
    const steps = Math.min(weak ? 2 : 3, Math.max(1, Math.ceil(delta / (1 / 30))))
    const sdt = Math.min(delta / steps, 1 / 30)
    const dt = Math.min(delta, 1 / 30)
    // Hold the intro until the wordmark is built too (or 3.5 s have passed), then start both on the same frame.
    if (!live.go) {
      const waited = performance.now() - (e.since ?? performance.now())
      if (reduced || (live.wm && waited > 400) || waited > 3500) {
        live.go = true
        useStore.getState().setReady(true)
      }
    } else st.sim += sdt * steps

    // The intro runs on simulation time so the wordmark never arrives before the snake has formed.
    const introT = reduced ? 9 : st.sim / 2.2
    const introVar = Math.round(smooth(0.95, 1.55, introT) * 50) / 50
    if (introVar !== st.lastIntroVar) {
      st.lastIntroVar = introVar
      document.documentElement.style.setProperty('--intro', String(introVar))
    }

    // Which room are we in, and how far toward the next one?
    const rooms = size.width < 1000 ? ROOMS_STACKED : ROOMS_DESKTOP
    const last = rooms.length - 1
    const s = live.section
    const i = Math.min(last, Math.floor(s))
    const j = Math.min(last, i + 1)
    // When the scroll stops, a half-made form commits to whichever room it is nearer to, and the grains tighten into it.
    if (Math.abs(s - st.lastS) > 0.0004) st.idle = 0
    else st.idle += dt
    st.lastS = s
    st.settle += ((st.idle > 0.25 ? 1 : 0) - st.settle) * (1 - Math.exp(-dt * 2.5))
    const tRaw = smooth(0.05, 0.2, s - i)
    const t = tRaw + (Math.round(tRaw) - tRaw) * st.settle
    const A = i === PRICING_ROOM ? { ...rooms[i], target: PLAN_TARGET[live.plan] } : rooms[i]
    const B = j === PRICING_ROOM ? { ...rooms[j], target: PLAN_TARGET[live.plan] } : rooms[j]
    const base = Math.min(1.15, Math.max(0.28, viewport.width / 10.8))
    const k = 1 - Math.exp(-dt * 7)

    wT.set(0, 0, 0, 0)
    wT2.set(0, 0, 0, 0)
    wT3.set(0, 0, 0, 0)
    const add = (idx: number, v: number) => {
      if (idx === 0) wT.x += v
      else if (idx === 1) wT.y += v
      else if (idx === 2) wT.z += v
      else if (idx === 3) wT.w += v
      else if (idx === 4) wT2.x += v
      else if (idx === 5) wT2.y += v
      else if (idx === 6) wT2.z += v
      else if (idx === 7) wT2.w += v
      else if (idx === 8) wT3.x += v
      else if (idx === 9) wT3.y += v
      else if (idx === 10) wT3.z += v
      else wT3.w += v
    }
    add(A.target, 1 - t)
    add(B.target, t)
    const swallow = A.target === 2 && B.target === 0

    g.scale.setScalar(lerp(g.scale.x, lerp(A.s, B.s, t) * base, k))
    g.position.x += (lerp(A.x, B.x, t) * (viewport.width / 13.3) - g.position.x) * k
    g.position.y += (lerp(A.y, B.y, t) - g.position.y) * k
    g.rotation.z += (lerp(A.rz, B.rz, t) - g.rotation.z) * k

    // Cursor / gyro parallax: tiny, physical.
    const nx = (live.pointer.x / size.width) * 2 - 1
    const ny = -(live.pointer.y / size.height) * 2 + 1
    const px = live.pointer.active ? nx : 0
    const py = live.pointer.active ? ny : 0
    const depthTarget = reduced ? 0 : live.interacted || s > 0.05 ? 1 : 0
    st.depth += (depthTarget - st.depth) * (1 - Math.exp(-dt * 0.9))
    const tx = reduced ? 0 : (px * 0.12 + live.tilt.x * 0.38) * st.depth
    const ty = reduced ? 0 : (-py * 0.08 - live.tilt.y * 0.26) * st.depth
    st.rotY += (tx - st.rotY) * (1 - Math.exp(-dt * 3))
    st.rotX += (ty - st.rotX) * (1 - Math.exp(-dt * 3))
    g.rotation.y = st.rotY
    g.rotation.x = st.rotX
    g.updateMatrixWorld()

    // Pointer projected onto the z=0 plane, then into the snake's own space.
    tmp.set(nx, ny, 0.5).unproject(camera)
    dir.copy(tmp).sub(camera.position).normalize()
    tmp.copy(camera.position).addScaledVector(dir, -camera.position.z / dir.z)
    g.worldToLocal(local.copy(tmp))
    if (prevLocal.x > 90) prevLocal.set(local.x, local.y)
    const rvx = (local.x - prevLocal.x) / Math.max(dt, 1e-3)
    const rvy = (local.y - prevLocal.y) / Math.max(dt, 1e-3)
    prevLocal.set(local.x, local.y)
    mouseVel.lerp(rawVel.set(rvx, rvy), 0.3)
    if (mouseVel.length() > 14) mouseVel.setLength(14)
    const msTarget = live.pointer.active && !reduced ? 1 : 0
    st.msk += (msTarget - st.msk) * (1 - Math.exp(-dt * 4))

    // The light: your cursor when you're here, a slow orbit when you're not, nudged by the phone's tilt.
    const time = state.clock.elapsedTime
    if (live.pointer.active) lightTarget.set(local.x, local.y, 2.4)
    else lightTarget.set(Math.cos(time * 0.22) * 3.5, 1.5 + Math.sin(time * 0.17) * 1.5, 2.8)
    lightTarget.x += live.tilt.x * 3
    lightTarget.y -= live.tilt.y * 2
    light.lerp(lightTarget, 1 - Math.exp(-dt * 3))

    // Text hover and the music both make the form breathe.
    live.audio = sound.level()
    st.pulse += (Math.max(live.pulse, live.audio * 0.9) - st.pulse) * (1 - Math.exp(-dt * 6))
    sound.stir(st.msk * Math.min(1, mouseVel.length() / 8))
    sound.brush(st.msk * Math.min(1, mouseVel.length() / 10))

    const m = live.theme
    colA.set(m.particle)
    colB.set(m.accent)
    colS.set(m.shadow)

    const ru = material.uniforms
    ru.uDim.value += (lerp(A.dim, B.dim, t) - ru.uDim.value) * k
    ru.uDepth.value = st.depth
    ru.uPulse.value = st.pulse
    ru.uLight.value.copy(light)
    ;(ru.uColorA.value as THREE.Color).lerp(colA, 1 - Math.exp(-dt * 2))
    ;(ru.uColorB.value as THREE.Color).lerp(colB, 1 - Math.exp(-dt * 2))
    ;(ru.uShadow.value as THREE.Color).lerp(colS, 1 - Math.exp(-dt * 2))
    ru.uAccentAmt.value += (m.accentAmt - ru.uAccentAmt.value) * (1 - Math.exp(-dt * 2))
    const grain = mobile ? 0.05 : weak ? 0.04 : 0.033
    ru.uSize.value = (grain * size.height * gl.getPixelRatio()) / 2 / Math.tan((50 * Math.PI) / 360)

    ru.uTime.value = time
    if (!e.gpu || !e.pos || !e.vel) return

    const vu = e.vel.material.uniforms
    const w = vu.uW.value as THREE.Vector4
    const w2 = vu.uW2.value as THREE.Vector4
    const w3 = vu.uW3.value as THREE.Vector4
    if (swallow) {
      w.copy(wT)
      w2.copy(wT2)
      w3.copy(wT3)
    } else {
      const lk = 1 - Math.exp(-dt * 9)
      w.lerp(wT, lk)
      w2.lerp(wT2, lk)
      w3.lerp(wT3, lk)
    }
    ;(ru.uW.value as THREE.Vector4).copy(w)
    ;(ru.uW2.value as THREE.Vector4).copy(w2)
    ;(ru.uW3.value as THREE.Vector4).copy(w3)

    vu.uDt.value = sdt
    e.pos.material.uniforms.uDt.value = sdt
    vu.uTime.value = time * (reduced ? 0.25 : 1)
    vu.uIntro.value = introT
    // Scrolling stirs the matter: the faster you move, the more the forms loosen, then they settle again.
    const scrollEnergy = Math.min(1, Math.abs(live.scrollVel) / 2600)
    vu.uStiff.value = 95 + 55 * st.settle
    vu.uTrans.value = reduced ? 0 : Math.sin(Math.PI * t) * (swallow ? 0.06 : 0.12) + scrollEnergy * 0.15
    vu.uDepth.value = st.depth
    vu.uSwallow.value = swallow ? t : -1
    vu.uFall.value = B.drop && B.target === 2 && A.target !== 2 ? B.drop * (1 - t * t) : 0
    vu.uPulse.value = st.pulse
    vu.uMouseStrength.value = st.msk
    vu.uShake.value = reduced ? 0 : live.shake
    vu.uWind.value = reduced ? 0 : live.blow * 0.4
    // The grove grows each time you arrive, and is cut back once you leave.
    // Bamboo rises as you scroll through the panda section.
    const growT = reduced ? 1 : Math.min(1, Math.max(0, (s - 7.2) / 0.5))
    st.grow += (growT - st.grow) * (1 - Math.exp(-dt * 9))
    vu.uGrow.value = 1 - Math.pow(1 - st.grow, 2.2)
    // The wireframe builds as you scroll through it: building, product, room, world.
    const wireTarget = Math.min(3, Math.max(0, (s - 4.6) * 1.5))
    st.wire += (wireTarget - st.wire) * (1 - Math.exp(-dt * 7))
    vu.uWire.value = st.wire
    ;(vu.uGrav.value as THREE.Vector2).set(reduced ? 0 : live.tilt.x, reduced ? 0 : -live.tilt.y)
    ;(vu.uMouse.value as THREE.Vector2).set(local.x, local.y)
    ;(vu.uMouseVel.value as THREE.Vector2).copy(mouseVel)

    for (let n = 0; n < steps; n++) e.gpu.compute()
    ru.tPos.value = e.gpu.getCurrentRenderTarget(e.pos).texture
  })

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}
