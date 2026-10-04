import * as THREE from 'three'

export function dataTexture(data: Float32Array, size: number) {
  const t = new THREE.DataTexture(data as unknown as BufferSource, size, size, THREE.RGBAFormat, THREE.FloatType)
  t.minFilter = THREE.NearestFilter
  t.magFilter = THREE.NearestFilter
  t.needsUpdate = true
  return t
}

// Texture coordinates of each particle inside the simulation textures.
export function particleGeometry(size: number) {
  const g = new THREE.BufferGeometry()
  const ref = new Float32Array(size * size * 2)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      ref[i * 2] = (x + 0.5) / size
      ref[i * 2 + 1] = (y + 0.5) / size
    }
  }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(size * size * 3), 3))
  g.setAttribute('ref', new THREE.BufferAttribute(ref, 2))
  return g
}
