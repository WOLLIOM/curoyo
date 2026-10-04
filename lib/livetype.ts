import { chamfer, markRandoms, markScatter, measureMark } from './targets'

// Live type: a headline redrawn exactly as the browser laid it out (same font, size, line breaks),
// then given the wordmark's character: the logo's kidney-bean spots are punched through the letters.

export async function renderElementText(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  const k = Math.min(3, 1100 / Math.max(1, r.width))
  const W = Math.max(2, Math.ceil(r.width * k))
  const H = Math.max(2, Math.ceil(r.height * k))
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  const cs = getComputedStyle(el)
  const font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * k}px ${cs.fontFamily}`
  try {
    await document.fonts.load(font)
  } catch {
    // fall back to whatever is loaded
  }
  ctx.font = font
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  const ls = parseFloat(cs.letterSpacing)
  if (!Number.isNaN(ls)) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${ls * k}px`

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node.textContent || ''
    const re = /\S+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      range.setStart(node, m.index)
      range.setEnd(node, m.index + m[0].length)
      const rect = range.getClientRects()[0]
      if (!rect) continue
      const tm = ctx.measureText(m[0])
      const descent = tm.fontBoundingBoxDescent || parseFloat(cs.fontSize) * k * 0.22
      ctx.fillText(m[0], (rect.left - r.left) * k, (rect.bottom - r.top) * k - descent)
    }
  }
  punchSpots(ctx, W, H)
  return c
}

// Spots sit inside the strokes, like on the wordmark: never cutting a letter in two.
function punchSpots(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const data = ctx.getImageData(0, 0, W, H).data
  const N = W * H
  const mask = new Uint8Array(N)
  let area = 0
  for (let i = 0; i < N; i++) {
    if (data[i * 4 + 3] > 128) {
      mask[i] = 1
      area++
    }
  }
  if (!area) return
  const d = chamfer(mask, W, H)
  let dMax = 0
  for (let i = 0; i < N; i++) if (d[i] > dMax) dMax = d[i]
  const r = dMax * 0.42
  if (r < 2) return
  const spots: [number, number][] = []
  const want = Math.round(area / (Math.PI * r * r * 7))
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  for (let tries = 0; tries < want * 40 && spots.length < want; tries++) {
    const i = (Math.random() * N) | 0
    if (d[i] < r * 1.2) continue
    const x = i % W
    const y = (i / W) | 0
    if (spots.some(([sx, sy]) => (sx - x) ** 2 + (sy - y) ** 2 < (r * 2.8) ** 2)) continue
    spots.push([x, y])
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.1, r * 0.66, Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export async function buildTextData(el: HTMLElement, size: number) {
  const count = size * size
  const c = await renderElementText(el)
  const m = measureMark(c, c.width, c.height, count)
  return { size, count, pos: m.pos, body: m.body, fill: m.fill, rand: markRandoms(count), scatter: markScatter(count) }
}
