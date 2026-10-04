'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { live } from '@/lib/store'

// A product you can hold: drag to turn it, tilt the phone to look around it, swap its finish.
// The kind of configurator a brand puts on a product page.

type Finish = 'spotted' | 'obsidian' | 'chrome' | 'glass'
export const FINISHES: { id: Finish; label: string }[] = [
  { id: 'spotted', label: 'Spotted ceramic' },
  { id: 'obsidian', label: 'Obsidian' },
  { id: 'chrome', label: 'Chrome' },
  { id: 'glass', label: 'Glass' },
]

function spotTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const ctx = c.getContext('2d') as CanvasRenderingContext2D
  ctx.fillStyle = '#f4f1ea'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.fillStyle = '#0b0c0e'
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * c.width
    const y = 30 + Math.random() * (c.height - 60)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.random() * Math.PI)
    ctx.beginPath()
    ctx.ellipse(0, 0, 16 + Math.random() * 14, 9 + Math.random() * 6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function Studio() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

function Vessel({ finish, drag }: { finish: Finish; drag: React.MutableRefObject<{ vy: number; ry: number; down: boolean }> }) {
  const mesh = useRef<THREE.Mesh>(null)
  const geometry = useMemo(() => {
    const pts: THREE.Vector2[] = [new THREE.Vector2(0.001, -1.2)]
    for (let i = 0; i <= 40; i++) {
      const t = i / 40
      const y = t * 2.4 - 1.2
      const r = 0.42 + Math.sin(t * Math.PI * 0.95) * 0.58 - Math.pow(Math.max(0, t - 0.72), 2) * 2.2 + Math.pow(Math.max(0, t - 0.9), 2) * 9
      pts.push(new THREE.Vector2(Math.max(0.05, r), y))
    }
    return new THREE.LatheGeometry(pts, 96)
  }, [])
  const spots = useMemo(() => spotTexture(), [])
  const materials = useMemo(
    () => ({
      spotted: new THREE.MeshPhysicalMaterial({ map: spots, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
      obsidian: new THREE.MeshPhysicalMaterial({ color: '#0b0b0d', roughness: 0.08, clearcoat: 1, metalness: 0.1 }),
      chrome: new THREE.MeshPhysicalMaterial({ color: '#e8e8e8', metalness: 1, roughness: 0.1 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 1, roughness: 0.04, thickness: 0.9, ior: 1.45, side: THREE.DoubleSide }),
    }),
    [spots]
  )
  useEffect(
    () => () => {
      geometry.dispose()
      spots.dispose()
      Object.values(materials).forEach((m) => m.dispose())
    },
    [geometry, spots, materials]
  )

  useFrame((_, delta) => {
    const m = mesh.current
    if (!m) return
    const d = drag.current
    if (!d.down) {
      d.vy *= Math.exp(-delta * 2.2)
      d.ry += d.vy * delta + delta * 0.25
    }
    m.rotation.y = d.ry
    m.rotation.x += (live.tilt.y * 0.35 - m.rotation.x) * (1 - Math.exp(-delta * 4))
    m.rotation.z += (-live.tilt.x * 0.3 - m.rotation.z) * (1 - Math.exp(-delta * 4))
  })

  return <mesh ref={mesh} geometry={geometry} material={materials[finish]} />
}

export default function ProductDemo() {
  const [finish, setFinish] = useState<Finish>('spotted')
  const [visible, setVisible] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef({ vy: 0, ry: 0, down: false })
  const last = useRef(0)

  // Only run the second 3D scene while it is on screen.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div
        ref={box}
        data-hover="Drag"
        className="relative min-h-0 flex-1 touch-pan-y"
        onPointerDown={(e) => {
          drag.current.down = true
          last.current = e.clientX
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current.down) return
          const dx = e.clientX - last.current
          last.current = e.clientX
          drag.current.ry += dx * 0.012
          drag.current.vy = dx * 0.7
        }}
        onPointerUp={() => (drag.current.down = false)}
        onPointerCancel={() => (drag.current.down = false)}
      >
        {visible && (
          <Canvas dpr={[1, 2]} camera={{ position: [0, 0.2, 4.6], fov: 35 }} gl={{ antialias: true, alpha: true }}>
            <Studio />
            <ambientLight intensity={0.25} />
            <directionalLight position={[3, 4, 3]} intensity={1.6} />
            <Vessel finish={finish} drag={drag} />
          </Canvas>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2 pt-4">
        {FINISHES.map((f) => (
          <button
            key={f.id}
            onClick={() => setFinish(f.id)}
            aria-pressed={finish === f.id}
            className="rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors"
            style={{
              background: finish === f.id ? 'var(--ink)' : 'color-mix(in srgb, var(--ink) 10%, transparent)',
              color: finish === f.id ? 'var(--bg)' : 'var(--ink)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
