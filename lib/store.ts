import { create } from 'zustand'

// Each theme is a complete atmosphere: background, text, the particles' lit colour,
// the colour their shadows fall into, and an accent that a share of the grains carry.
export interface Theme {
  name: string
  bg: string
  glow: string // a soft light in the background
  ink: string // text
  particle: string
  shadow: string
  accent: string
  accentAmt: number
  light?: boolean // light background: the white logo images are inverted
}

export const THEMES = {
  void: { name: 'Void', bg: '#08090b', glow: '#14171c', ink: '#ffffff', particle: '#ffffff', shadow: '#b8bfca', accent: '#ffffff', accentAmt: 0 },
  mineral: { name: 'Mineral', bg: '#14130f', glow: '#22211a', ink: '#ece6d4', particle: '#ece6d4', shadow: '#7d8a5c', accent: '#a3b06e', accentAmt: 0.14 },
  pop: { name: 'Pop', bg: '#7d0d06', glow: '#a51108', ink: '#eef56f', particle: '#80bfff', shadow: '#ff2d24', accent: '#eef56f', accentAmt: 0.2 },
  graphite: { name: 'Graphite', bg: '#1b1c1f', glow: '#2b2d32', ink: '#f1f1f1', particle: '#f1f1f1', shadow: '#8d9097', accent: '#ffffff', accentAmt: 0 },
  primary: { name: 'Paper', bg: '#f4f3f0', glow: '#ffffff', ink: '#141414', particle: '#141414', shadow: '#8a8a8a', accent: '#141414', accentAmt: 0, light: true },
  ember: { name: 'Ember', bg: '#090606', glow: '#2a0d07', ink: '#fff1e2', particle: '#e8481c', shadow: '#5a1408', accent: '#ff9a5c', accentAmt: 0.2 },
  autumn: { name: 'Autumn', bg: '#022f49', glow: '#063f5f', ink: '#ece3b8', particle: '#fdb955', shadow: '#d72a2a', accent: '#f7820a', accentAmt: 0.25 },
  night: { name: 'Night', bg: '#040814', glow: '#0c1c40', ink: '#e6f0ff', particle: '#bcd8ff', shadow: '#2d5bd1', accent: '#5ee0ff', accentAmt: 0.24 },
  garden: { name: 'Garden', bg: '#132a13', glow: '#1e3d1c', ink: '#ecf39e', particle: '#ecf39e', shadow: '#4f772d', accent: '#90a955', accentAmt: 0.2 },
} satisfies Record<string, Theme>

export type Mode = keyof typeof THEMES
export const MODES: Record<Mode, Theme> = THEMES

export type ModeChoice = Mode | 'auto'

function savedMode(): ModeChoice {
  try {
    const m = localStorage.getItem('curoyo-theme') as ModeChoice | null
    if (m && (m === 'auto' || m in THEMES)) return m
  } catch {
    // storage unavailable
  }
  return 'auto'
}

interface State {
  mode: ModeChoice
  setMode: (m: ModeChoice) => void
  ready: boolean
  setReady: (v: boolean) => void
  gyroOn: boolean
  setGyroOn: (v: boolean) => void
  // true once the live particle wordmark is running; the flat image stays as a fallback otherwise
  liveWordmark: boolean
  setLiveWordmark: (v: boolean) => void
  soundOn: boolean
  setSoundOn: (v: boolean) => void
  track: number
  setTrack: (i: number) => void
  game: boolean
  setGame: (v: boolean) => void
}

export const useStore = create<State>((set) => ({
  mode: 'auto',
  setMode: (mode) => {
    try {
      localStorage.setItem('curoyo-theme', mode)
    } catch {
      // storage unavailable
    }
    set({ mode })
  },
  ready: false,
  setReady: (ready) => set({ ready }),
  gyroOn: false,
  setGyroOn: (gyroOn) => set({ gyroOn }),
  liveWordmark: false,
  setLiveWordmark: (liveWordmark) => set({ liveWordmark }),
  soundOn: false,
  setSoundOn: (soundOn) => set({ soundOn }),
  track: 0,
  setTrack: (track) => set({ track }),
  game: false,
  setGame: (game) => set({ game }),
}))

export function restoreMode() {
  useStore.setState({ mode: savedMode() })
}

// High-frequency values live outside React state.
export const live = {
  section: 0,
  pointer: { x: 0, y: 0, active: false },
  tilt: { x: 0, y: 0 },
  interacted: false,
  lastInput: 0,
  pulse: 0,
  audio: 0,
  scrollVel: 0,
  shake: 0,
  plan: 1,
  blow: 0,
  // Start-up gate: the intro only begins once the snake and the wordmark are both built (wm), so it never runs through a hitch.
  wm: false,
  go: false,
  // The blended theme on screen right now; every visual reads from this.
  theme: { ...THEMES.void } as Theme,
}
