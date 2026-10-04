import { live, THEMES, useStore, type Mode, type Theme } from './store'

// In "by section" mode each part of the story has its own atmosphere, and scrolling blends between them.
export const SECTION_THEME: Record<string, Mode> = {
  intro: 'void',
  eden: 'garden',
  idea: 'garden',
  form: 'night',
  newton: 'void',
  panda: 'ember',
  work: 'void',
  studio: 'ember',
  beyond: 'void',
  play: 'void',
  pricing: 'ember',
  about: 'ember',
  credentials: 'ember',
  contact: 'night',
}

type RGB = [number, number, number]
const KEYS = ['bg', 'glow', 'ink', 'particle', 'shadow', 'accent'] as const

function rgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function hex(c: RGB) {
  return '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

// The colours actually on screen right now, smoothed toward the target so every change is a fade.
const shown: Record<(typeof KEYS)[number], RGB> & { accentAmt: number; light: number } = {
  bg: rgb(THEMES.void.bg),
  glow: rgb(THEMES.void.glow),
  ink: rgb(THEMES.void.ink),
  particle: rgb(THEMES.void.particle),
  shadow: rgb(THEMES.void.shadow),
  accent: rgb(THEMES.void.accent),
  accentAmt: 0,
  light: 0,
}

function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export function targetTheme(sectionIds: string[]): { a: Theme; b: Theme; t: number } {
  const mode = useStore.getState().mode
  if (mode !== 'auto') return { a: THEMES[mode], b: THEMES[mode], t: 0 }
  const s = live.section
  const i = Math.min(sectionIds.length - 1, Math.floor(s))
  const j = Math.min(sectionIds.length - 1, i + 1)
  return { a: THEMES[SECTION_THEME[sectionIds[i]] || 'void'], b: THEMES[SECTION_THEME[sectionIds[j]] || 'void'], t: smooth(0.15, 0.85, s - i) }
}

// Called every frame. Returns true when the visible colours changed.
export function stepTheme(sectionIds: string[], dt: number) {
  const { a, b, t } = targetTheme(sectionIds)
  const k = 1 - Math.exp(-dt * 5)
  let changed = false
  for (const key of KEYS) {
    const ca = rgb(a[key])
    const cb = rgb(b[key])
    const cur = shown[key]
    for (let c = 0; c < 3; c++) {
      const target = ca[c] + (cb[c] - ca[c]) * t
      const next = cur[c] + (target - cur[c]) * k
      if (Math.abs(next - cur[c]) > 0.05) changed = true
      cur[c] = next
    }
  }
  const amt = a.accentAmt + (b.accentAmt - a.accentAmt) * t
  shown.accentAmt += (amt - shown.accentAmt) * k
  const light = (a.light ? 1 : 0) * (1 - t) + (b.light ? 1 : 0) * t
  shown.light += (light - shown.light) * k

  const th: Theme = live.theme
  th.bg = hex(shown.bg)
  th.glow = hex(shown.glow)
  th.ink = hex(shown.ink)
  th.particle = hex(shown.particle)
  th.shadow = hex(shown.shadow)
  th.accent = hex(shown.accent)
  th.accentAmt = shown.accentAmt
  th.light = shown.light > 0.5
  th.name = t < 0.5 ? a.name : b.name
  return changed
}
