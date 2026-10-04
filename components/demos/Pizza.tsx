'use client'

import { useEffect, useRef, useState } from 'react'
import { tier } from '@/lib/perf'

// A real client build (Ovenlight): the site's own pizza model, turned into grains in the browser. Pick toppings and they
// drop on; drag to spin. Points are sampled from the GLB's triangles, so every node can be switched on and off.
const SITE = 'https://scalexpizza.vercel.app/'

const TOPPINGS = [
  ['Topping_pepperoni', 'Pepperoni'],
  ['Topping_ham', 'Ham'],
  ['Topping_pineapple', 'Pineapple'],
  ['Topping_mushroom', 'Mushroom'],
  ['Topping_olive', 'Olive'],
  ['Topping_chili', 'Chili'],
  ['Topping_fior', 'Mozzarella'],
  ['Topping_basil', 'Basil'],
] as const
const SAUCES = [
  ['Sauce_tomato', 'Tomato'],
  ['Sauce_bbq', 'BBQ'],
  ['Sauce_white', 'White'],
] as const
const MENU: { name: string; on: string[] }[] = [
  { name: 'Pepperoni', on: ['Sauce_tomato', 'Topping_pepperoni'] },
  { name: 'Hawaiian', on: ['Sauce_tomato', 'Topping_ham', 'Topping_pineapple'] },
  { name: 'BBQ', on: ['Sauce_bbq', 'Topping_ham', 'Topping_mushroom'] },
  { name: 'Margherita', on: ['Sauce_tomato', 'Topping_fior', 'Topping_basil'] },
  { name: 'Diavola', on: ['Sauce_tomato', 'Topping_pepperoni', 'Topping_chili'] },
  { name: 'Nero', on: ['Sauce_white', 'Topping_mushroom', 'Topping_olive', 'Topping_fior'] },
]
const ALWAYS = ['Crust', 'Cheese']

// Each piece gets its own colour so it reads as food; the model's texture only adds the light and dark detail.
const PALETTE: Record<string, string> = {
  Crust: '#d79a45', Cheese: '#f7d57e', Sauce_tomato: '#a8281a', Sauce_bbq: '#6a2a14', Sauce_white: '#f3ead2', Sauce_hot: '#b3180d',
  Sauce_sweet: '#d98a22', Sauce_mayo: '#f4eed8', Sauce_ketchup: '#b0170e', Topping_pepperoni: '#ff3b2a', Topping_salami: '#9d2c25',
  Topping_ham: '#f29aa0', Topping_pineapple: '#ffd93a', Topping_chicken: '#ecc78c', Topping_redonion: '#a23fa5', Topping_onion: '#e3b068',
  Topping_mushroom: '#c2a183', Topping_olive: '#2b3a1e', Topping_chili: '#ee2e17', Topping_truffle: '#3a271a', Topping_fior: '#fff6e0',
  Topping_burrata: '#fffdf4', Topping_basil: '#2fae3c',
}
const hex3 = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

const SKIP = ['Sauce_sweet', 'Sauce_mayo', 'Sauce_ketchup', 'Topping_onion', 'Topping_salami', 'Topping_chicken', 'Topping_redonion', 'Topping_truffle', 'Topping_burrata', 'Sauce_hot']

type Cloud = { n: number; x: Float32Array; y: Float32Array; z: Float32Array; c: Uint8Array; g: Uint8Array; names: string[] }

async function loadCloud(budget: number): Promise<Cloud> {
  const THREE = await import('three')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js')
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const gltf = await loader.loadAsync('/models/pizza.glb')
  const root = gltf.scene
  root.updateMatrixWorld(true)
  const names: string[] = []
  const groupOf = (o: import('three').Object3D) => {
    for (let p: import('three').Object3D | null = o; p; p = p.parent) {
      if (p.name && (/^(Topping_|Sauce_)/.test(p.name) || p.name === 'Crust' || p.name === 'Cheese')) return p.name
    }
    return ''
  }
  type M = { mesh: import('three').Mesh; g: number; area: number; tris: number; cum: Float32Array }
  const metas: M[] = []
  let total = 0
  root.traverse((o) => {
    const mesh = o as import('three').Mesh
    if (!mesh.isMesh || !mesh.geometry.attributes.position) return
    const gname = groupOf(mesh)
    if (!gname || SKIP.includes(gname)) return
    let g = names.indexOf(gname)
    if (g < 0) g = names.push(gname) - 1
    const geo = mesh.geometry
    const pos = geo.attributes.position
    const idx = geo.index
    const tris = idx ? idx.count / 3 : pos.count / 3
    const cum = new Float32Array(tris)
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c = new THREE.Vector3()
    let area = 0
    for (let t = 0; t < tris; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2
      a.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrixWorld)
      b.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrixWorld)
      c.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrixWorld)
      area += b.sub(a).cross(c.sub(a)).length() * 0.5
      cum[t] = area
    }
    metas.push({ mesh, g, area, tris, cum })
    total += area
  })
  // Points per mesh by area, with a floor so small toppings still read.
  // Fixed density per unit area, sized for what is visible at once (crust, cheese, one sauce, a few toppings).
  void total
  const density = budget / 90
  const alloc = metas.map((m) => Math.max(60, Math.round(m.area * density)))
  const N = alloc.reduce((s, v) => s + v, 0)
  const out: Cloud = { n: N, x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N), c: new Uint8Array(N * 3), g: new Uint8Array(N), names }
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
  const col = new THREE.Color()
  let k = 0
  metas.forEach((m, mi) => {
    const geo = m.mesh.geometry
    const pos = geo.attributes.position
    const idx = geo.index
    const cattr = geo.attributes.color
    const mat = (Array.isArray(m.mesh.material) ? m.mesh.material[0] : m.mesh.material) as import('three').MeshStandardMaterial
    const base = mat.color ? mat.color : new THREE.Color(0.8, 0.6, 0.3)
    const uv = geo.attributes.uv
    let tex: ImageData | null = null
    const im = mat.map?.image as CanvasImageSource & { width: number; height: number } | undefined
    if (im && uv) {
      const cvs = document.createElement('canvas')
      cvs.width = im.width
      cvs.height = im.height
      const tc = cvs.getContext('2d', { willReadFrequently: true })
      if (tc) {
        tc.drawImage(im, 0, 0)
        tex = tc.getImageData(0, 0, cvs.width, cvs.height)
      }
    }
    for (let s = 0; s < alloc[mi]; s++) {
      const r = Math.random() * m.area
      let lo = 0
      let hi = m.tris - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (m.cum[mid] < r) lo = mid + 1
        else hi = mid
      }
      const ids = idx ? [idx.getX(lo * 3), idx.getX(lo * 3 + 1), idx.getX(lo * 3 + 2)] : [lo * 3, lo * 3 + 1, lo * 3 + 2]
      let u = Math.random()
      let w = Math.random()
      if (u + w > 1) {
        u = 1 - u
        w = 1 - w
      }
      const bw = [1 - u - w, u, w]
      let px = 0
      let py = 0
      let pz = 0
      let tu = 0
      let tv = 0
      let cr = 0
      let cg = 0
      let cb = 0
      for (let j = 0; j < 3; j++) {
        v[j].fromBufferAttribute(pos, ids[j]).applyMatrix4(m.mesh.matrixWorld)
        px += v[j].x * bw[j]
        py += v[j].y * bw[j]
        pz += v[j].z * bw[j]
        if (tex) {
          tu += uv.getX(ids[j]) * bw[j]
          tv += uv.getY(ids[j]) * bw[j]
        }
        if (cattr) {
          cr += cattr.getX(ids[j]) * bw[j]
          cg += cattr.getY(ids[j]) * bw[j]
          cb += cattr.getZ(ids[j]) * bw[j]
        }
      }
      let lum = 1
      if (tex) {
        const tx = Math.min(tex.width - 1, Math.max(0, Math.floor((tu - Math.floor(tu)) * tex.width)))
        const ty = Math.min(tex.height - 1, Math.max(0, Math.floor((tv - Math.floor(tv)) * tex.height)))
        const o = (ty * tex.width + tx) * 4
        lum = 0.45 + ((tex.data[o] + tex.data[o + 1] + tex.data[o + 2]) / 765) * 0.75
      }
      const pal = hex3(PALETTE[names[m.g]] || '#cc9955')
      const rgb = [pal[0] * lum, pal[1] * lum, pal[2] * lum]
      // The cheese is patchy, so the sauce shows through in places.
      if (names[m.g] === 'Cheese' && Math.random() < 0.22) {
        out.g[k] = 255
        out.x[k] = 0
        out.y[k] = -99
        out.z[k] = 0
        k++
        continue
      }
      const jit = 0.85 + Math.random() * 0.3
      out.x[k] = px
      out.y[k] = py
      out.z[k] = pz
      out.c[k * 3] = Math.min(255, rgb[0] * jit)
      out.c[k * 3 + 1] = Math.min(255, rgb[1] * jit)
      out.c[k * 3 + 2] = Math.min(255, rgb[2] * jit)
      out.g[k] = m.g
      k++
    }
  })
  return out
}

export default function PizzaShowcase() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [on, setOn] = useState<string[]>(MENU[0].on)
  const [menu, setMenu] = useState(0)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const onRef = useRef(on)
  onRef.current = on

  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    let dead = false
    let raf = 0
    let cloud: Cloud | null = null
    const phone = window.matchMedia('(max-width: 760px)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let sc = 1
    let img: ImageData
    let depth: Float32Array
    const resize = () => {
      const r = cv.getBoundingClientRect()
      sc = Math.min(phone ? 1 : 1.5, window.devicePixelRatio || 1)
      w = Math.max(10, Math.round(r.width * sc))
      h = Math.max(10, Math.round(r.height * sc))
      cv.width = w
      cv.height = h
      img = ctx.createImageData(w, h)
      depth = new Float32Array(w * h)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

    // The 1.6 MB model is only fetched and sampled once the showcase is about a screen away.
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        near.disconnect()
        loadCloud(phone ? 22000 : tier() === 'low' ? 30000 : 42000)
          .then((c) => {
            if (dead) return
            cloud = c
            vis = c.names.map(() => 0)
            setState('ready')
          })
          .catch(() => !dead && setState('error'))
      },
      { rootMargin: '100% 0px' }
    )
    near.observe(cv)

    let vis: number[] = []
    let rot = 0.6
    let vel = 0.25
    let tilt = 1.15
    let down = false
    let lastX = 0
    let lastY = 0
    let idle = 0
    const onDown = (e: PointerEvent) => {
      down = true
      lastX = e.clientX
      lastY = e.clientY
      cv.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (e.buttons === 0 && e.pointerType === 'mouse') down = false
      if (!down) return
      vel = (e.clientX - lastX) * 0.012
      rot += (e.clientX - lastX) * 0.012
      tilt = Math.max(0.7, Math.min(1.5, tilt + (e.clientY - lastY) * 0.006))
      lastX = e.clientX
      lastY = e.clientY
      idle = 0
    }
    const onUp = () => (down = false)
    cv.addEventListener('pointerdown', onDown)
    cv.addEventListener('pointermove', onMove)
    cv.addEventListener('pointerup', onUp)
    cv.addEventListener('pointercancel', onUp)

    let last = performance.now()
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(cv)
    const wanted = (name: string) => ALWAYS.includes(name) || onRef.current.includes(name)

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (!visible || document.hidden) {
        last = now
        return
      }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const d = img.data
      // clear to bg
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        d[i + 3] = 0
        depth[j] = -1e9
      }
      if (cloud) {
        if (!down) {
          idle += dt
          vel += (0.22 - vel) * Math.min(1, dt * 1.2)
          rot += vel * dt
        }
        const names = cloud.names
        for (let g = 0; g < names.length; g++) {
          const tgt = wanted(names[g]) ? 1 : 0
          vis[g] += (tgt - vis[g]) * Math.min(1, dt * 4.5)
        }
        const cr = Math.cos(rot)
        const sr = Math.sin(rot)
        const ct = Math.cos(tilt)
        const st = Math.sin(tilt)
        const S = Math.min(w, h) * 0.255
        const cx = w / 2
        const cy = h * 0.54
        const sz = Math.max(1, Math.max(2, Math.round(sc * 2)))
        for (let i = 0; i < cloud.n; i++) {
          const gv = vis[cloud.g[i]]
          if (gv < 0.03 || cloud.g[i] === 255) continue
          // toppings fall onto the pizza from above as they appear
          let y0 = cloud.y[i]
          let x0 = cloud.x[i]
          let z0 = cloud.z[i]
          const fall = (1 - gv) * (1 - gv)
          if (fall > 0) y0 += fall * (1.2 + (i % 7) * 0.35)
          // spin about y, then tilt about x
          const x1 = x0 * cr + z0 * sr
          const z1 = -x0 * sr + z0 * cr
          const y2 = y0 * ct - z1 * st
          const z2 = y0 * st + z1 * ct
          const px = Math.round(cx + x1 * S)
          const py = Math.round(cy - y2 * S)
          if (px < 0 || py < 0 || px >= w - sz || py >= h - sz) continue
          const lit = 0.72 + 0.28 * Math.max(0, Math.min(1, (y0 + 0.2) * 1.4))
          const a = Math.min(1, gv * 1.1)
          for (let oy = 0; oy < sz; oy++) {
            for (let ox = 0; ox < sz; ox++) {
              const p = (py + oy) * w + px + ox
              if (z2 < depth[p]) continue
              depth[p] = z2
              const q = p * 4
              d[q] = cloud.c[i * 3] * lit
              d[q + 1] = cloud.c[i * 3 + 1] * lit
              d[q + 2] = cloud.c[i * 3 + 2] * lit
              d[q + 3] = a * 255
            }
          }
        }
      }
      ctx.putImageData(img, 0, 0)
    }
    if (reduced) setTimeout(() => tick(performance.now()), 600)
    raf = requestAnimationFrame(tick)
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      near.disconnect()
      cv.removeEventListener('pointerdown', onDown)
      cv.removeEventListener('pointermove', onMove)
      cv.removeEventListener('pointerup', onUp)
      cv.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const toggle = (name: string) => {
    setMenu(-1)
    setOn((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]))
  }
  const chip = (active: boolean) =>
    ({
      background: active ? 'var(--hot)' : 'transparent',
      color: active ? 'var(--bg)' : 'var(--ink)',
      boxShadow: active ? 'none' : 'inset 0 0 0 1.5px var(--line)',
    }) as const

  return (
    <div className="overflow-hidden" style={{ borderRadius: 28, boxShadow: 'inset 0 0 0 1.5px var(--line)', background: 'color-mix(in srgb, var(--bg) 55%, transparent)', color: 'var(--ink)' }}>
      <div className="grid lg:grid-cols-[1.25fr_1fr]">
        <div className="relative h-[420px] lg:h-[560px]">
          <canvas ref={ref} className="absolute inset-0 h-full w-full cursor-grab touch-pan-y active:cursor-grabbing" aria-label="Interactive pizza made of particles: drag to spin" />
          <p className="pointer-events-none absolute left-5 top-4 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: 'var(--hot)' }}>
            {state === 'loading' ? 'Heating the oven…' : state === 'error' ? 'Could not load the model' : 'Drag to spin · pick toppings'}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-5 p-6 sm:p-9">
          <p className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ background: 'var(--hot)', color: 'var(--bg)' }}>
            Real client build · 3D ordering
          </p>
          <h3 className="font-display text-[clamp(30px,3.6vw,48px)] leading-[1.02]">Ovenlight, pizza by the slice.</h3>
          <p className="text-[15px] font-bold leading-snug" style={{ color: 'var(--muted)' }}>
            We built a whole pizza shop in 3D: grab the pizza, turn it over, pull a slice out, build your own. This is its model, rebuilt from grains. Every sauce and topping is its own piece.
          </p>
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: 'var(--hot)' }}>Menu</p>
            <div className="flex flex-wrap gap-2">
              {MENU.map((m, i) => (
                <button key={m.name} onClick={() => { setMenu(i); setOn(m.on) }} className="rounded-full px-3 py-1.5 text-[13px] font-bold transition-transform active:scale-95" style={chip(menu === i)}>
                  {m.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: 'var(--hot)' }}>Build your own</p>
            <div className="flex flex-wrap gap-1.5">
              {SAUCES.map(([id, label]) => (
                <button key={id} onClick={() => toggle(id)} className="rounded-full px-2.5 py-1 text-[12px] font-bold transition-transform active:scale-95" style={chip(on.includes(id))}>
                  {label} sauce
                </button>
              ))}
              {TOPPINGS.map(([id, label]) => (
                <button key={id} onClick={() => toggle(id)} className="rounded-full px-2.5 py-1 text-[12px] font-bold transition-transform active:scale-95" style={chip(on.includes(id))}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <a href={SITE} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-extrabold transition-transform hover:-translate-y-0.5" style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
            Visit the live site ↗
          </a>
        </div>
      </div>
    </div>
  )
}
