'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { live, restoreMode, THEMES, useStore, type Mode, type ModeChoice } from '@/lib/store'
import { SECTION_THEME, stepTheme } from '@/lib/theme'
import { hashText, sound, TRACKS } from '@/lib/sound'
import Contact from './Contact'
import Credentials, { type Cert } from './Credentials'
import Gyro from './Gyro'
import EdenLife from './EdenLife'
import AboutSides from './AboutSides'
import HStrip from './HStrip'
import Torch from './Torch'
import CertObject, { type ObjKind } from './CertObject'
import MountainLife from './MountainLife'
import HoverWords from './HoverWords'
import Pricing from './Pricing'
import SnakeGame from './SnakeGame'
import { WordDemo, GravityDemo, DaylightDemo } from './demos/Playground'
import PizzaShowcase from './demos/Pizza'
import { ConfiguratorDemo, DashboardDemo, OrderDemo, GlobeDemo, AssistantDemo } from './demos/Pro'


// Add a real address here; until then the contact section says details are coming.
const CONTACT_EMAIL = ''

const SECTION_IDS = ['intro', 'eden', 'newton', 'idea', 'form', 'work', 'studio', 'beyond', 'panda', 'play', 'pricing', 'about', 'credentials', 'contact']
// Left edge, wide screens only: my name runs down the side and fills with the theme colour as you scroll, with a glowing
// spark riding the edge of the fill. A fully coloured name means you have reached the end.
function ScrollLine() {
  const name = useRef<HTMLDivElement>(null)
  const spark = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let raf = 0
    let p = 0
    const tick = () => {
      const max = document.documentElement.scrollHeight - innerHeight
      const t = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0
      p += (t - p) * 0.12
      if (name.current) name.current.style.setProperty('--p', `${(p * 100).toFixed(2)}%`)
      if (spark.current) {
        spark.current.style.top = `${(p * 100).toFixed(2)}%`
        spark.current.style.opacity = p > 0.005 && p < 0.995 ? '1' : '0'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div aria-hidden className="pointer-events-none fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
      <div
        ref={name}
        className="font-display text-[26px] leading-none tracking-[0.18em]"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
          backgroundImage: 'linear-gradient(to bottom, var(--hot) var(--p, 0%), color-mix(in srgb, var(--ink) 26%, transparent) var(--p, 0%))',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--hot) 45%, transparent))',
        }}
      >
        SIMONMAXAM
      </div>
      <span
        ref={spark}
        className="absolute -left-[3px] h-[6px] w-[6px] -translate-y-1/2 rounded-full transition-opacity duration-300"
        style={{ background: 'var(--ink)', boxShadow: '0 0 10px 3px var(--hot)', opacity: 0 }}
      />
    </div>
  )
}
const NAV = [
  { label: 'Work', id: 'work' },
  { label: 'Studio', id: 'studio' },
  { label: 'Try it', id: 'play' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'About', id: 'about' },
  { label: 'Contact', id: 'contact' },
]

const PROJECTS = [
  {
    name: 'Scalex Pizza',
    kind: 'Web · 3D',
    host: 'scalexpizza.vercel.app',
    color: '#ff4a3d',
    obj: 'pizza' as ObjKind,
    url: 'https://scalexpizza.vercel.app/',
    text: 'A pizza menu you can pick apart: a 3D pie, slices to pull out, and a tray that fills as you order.',
  },
  {
    name: 'KŌRA',
    kind: 'Web · 3D',
    host: 'korastudio-phi.vercel.app',
    color: '#ffc233',
    obj: 'bowl' as ObjKind,
    url: 'https://korastudio-phi.vercel.app/',
    text: 'A noodle-bowl ordering experience built around a 3D bowl you can explore ingredient by ingredient.',
  },
  {
    name: 'SIMAX',
    kind: 'Web · Interactive 3D',
    host: 'simonmaxam.pages.dev',
    color: '#8b7bff',
    obj: 'guitar' as ObjKind,
    url: 'https://simonmaxam.pages.dev/',
    text: 'My own corner of the web: websites, apps and interactive 3D, with a 3D guitar and songs you can listen to.',
  },
]

const DISCIPLINES = [
  { name: '3D', text: 'Blender, Unreal Engine 5, Siemens NX' },
  { name: 'Architecture', text: 'Revit, Rhino, SketchUp, AutoCAD' },
  { name: 'Code', text: 'JavaScript, Three.js, React, Python, C++' },
  { name: 'Design', text: 'Photoshop, Illustrator, Premiere Pro' },
  { name: 'Music', text: 'Guitar for about seven years: classical, fingerstyle, jazz' },
]

const DEMOS = [
  { color: '#ff7a3d', note: 'Try it: drag the bottle, tap a finish', tag: '3D product', title: 'Configurators that sell', line: 'Rotate it, change the finish, see it in real time before you buy.', el: <ConfiguratorDemo /> },
  { color: '#4fb3ff', note: 'Try it: slide across the chart', tag: 'Data', title: 'Dashboards people read', line: 'Live numbers, clear charts, and detail on hover instead of a wall of tables.', el: <DashboardDemo /> },
  { color: '#ffc233', note: 'Try it: add to the order', tag: 'Commerce', title: 'Ordering without friction', line: 'Menus, carts and checkout that stay quick on a phone.', el: <OrderDemo /> },
  { color: '#8b7bff', note: 'Try it: pick a question', tag: 'AI', title: 'Assistants on your content', line: 'Answers to customer questions, drawn from your own material and tone.', el: <AssistantDemo /> },
  { color: '#ff4a3d', note: 'Try it: type your own name', tag: 'Brand', title: 'Type that assembles', line: 'Write a word. Push it, pull it, scatter it. Your name, made physical.', el: <WordDemo bg="#ff4a3d" fg="#fff1e2" acc="#1a0505" /> },
  { color: '#2fd0a0', note: 'Try it: click to drop suns', tag: 'Interactive', title: 'Worlds you can play with', line: 'Click to drop a sun and watch the swarm fall in. Memorable on first touch.', el: <GravityDemo bg="#04130f" fg="#d9fff0" acc="#2fd0a0" /> },
  { color: '#4fb3ff', note: 'Try it: move to tilt the globe', tag: 'Network', title: 'Maps and live routes', line: 'Show where things are and how they move: deliveries, users, offices.', el: <GlobeDemo /> },
  { color: '#ff8f5a', note: 'Try it: drag the time slider', tag: 'Story', title: 'Sites that follow the day', line: 'Drag time and the whole landscape answers. Scroll-led storytelling.', el: <DaylightDemo /> },
]

// A section marker made of one of the logo's spots and a plain word.
function Label({ children }: { children: string }) {
  return (
    <p className="inline-flex items-center gap-2.5 text-[15px] font-bold" style={{ color: 'var(--muted)' }}>
      <span aria-hidden className="inline-block h-[12px] w-[7px] -rotate-[14deg] rounded-full" style={{ background: 'var(--ink)' }} />
      {children}
    </p>
  )
}

function Lightbox({ cert, onClose }: { cert: Cert | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!cert) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cert, onClose])
  if (!cert) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={cert.title}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm sm:p-10"
      style={{ background: 'color-mix(in srgb, var(--bg) 88%, transparent)' }}
      onClick={onClose}
    >
      <figure className="flex max-h-full max-w-[min(94vw,1100px)] flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/certs/${cert.img}.png`} alt={`Certificate: ${cert.title}`} className="max-h-[78vh] w-auto rounded-md object-contain" />
        <figcaption className="flex items-center justify-between gap-6 text-[14px] font-bold" style={{ color: 'var(--muted)' }}>
          <span>{cert.title}</span>
          <button ref={closeRef} onClick={onClose} className="shrink-0 underline-offset-4 hover:underline focus-visible:underline" style={{ color: 'var(--ink)' }}>
            Close
          </button>
        </figcaption>
      </figure>
    </div>
  )
}

function ThemePicker() {
  const { mode, setMode } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', key)
    }
  }, [open])
  const dots = (t: (typeof THEMES)[Mode]) => [t.bg, t.particle, t.shadow, t.accent]
  const autoDots = ['intro', 'eden', 'about', 'contact'].map((id) => THEMES[SECTION_THEME[id]].particle)
  const options: { id: ModeChoice; name: string; dots: string[] }[] = [
    { id: 'auto', name: 'By section', dots: autoDots },
    ...(Object.keys(THEMES) as Mode[]).map((id) => ({ id, name: THEMES[id].name, dots: dots(THEMES[id]) })),
  ]
  const current = options.find((o) => o.id === mode) || options[0]
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2 text-[14px] font-bold opacity-80 transition-opacity hover:opacity-100"
      >
        <span className="flex -space-x-1">
          {current.dots.map((c, i) => (
            <span key={i} className="h-3 w-3 rounded-full" style={{ background: c, boxShadow: '0 0 0 1.5px var(--bg)' }} />
          ))}
        </span>
        <span className="max-sm:hidden">{current.name}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Theme"
          className="absolute bottom-10 right-0 w-56 rounded-2xl p-2 backdrop-blur-xl"
          style={{ background: 'color-mix(in srgb, var(--bg) 82%, transparent)', boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px color-mix(in srgb, var(--ink) 12%, transparent)' }}
        >
          {options.map(({ id, name, dots: d }) => (
            <li key={id}>
              <button
                role="option"
                aria-selected={mode === id}
                onClick={() => {
                  setMode(id)
                  sound.pluck(hashText(id))
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-bold transition-colors"
                style={{ background: mode === id ? 'color-mix(in srgb, var(--ink) 12%, transparent)' : 'transparent' }}
              >
                {name}
                <span className="flex -space-x-1">
                  {d.map((c, i) => (
                    <span key={i} className="h-3.5 w-3.5 rounded-full" style={{ background: c, boxShadow: '0 0 0 1.5px var(--bg)' }} />
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SoundControl() {
  const { soundOn, setSoundOn, track, setTrack } = useStore()
  useEffect(() => {
    sound.onTrackEnd = () => {
      const next = (useStore.getState().track + 1) % TRACKS.length
      useStore.getState().setTrack(next)
      sound.play(next)
    }
  }, [])
  // On by default: browsers only allow audio after a gesture, so it starts with the first touch or key.
  useEffect(() => {
    let off = false
    try { off = localStorage.getItem('sound-off') === '1' } catch {}
    if (off) return
    const start = async () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      if (useStore.getState().soundOn) return
      try {
        await sound.enable(useStore.getState().track)
        useStore.getState().setSoundOn(true)
      } catch {}
    }
    window.addEventListener('pointerdown', start)
    window.addEventListener('keydown', start)
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
    }
  }, [])
  const toggle = async () => {
    try { localStorage.setItem('sound-off', soundOn ? '1' : '0') } catch {}
    if (soundOn) {
      sound.disable()
      setSoundOn(false)
    } else {
      await sound.enable(track)
      setSoundOn(true)
    }
  }
  return (
    <div className="pointer-events-auto flex items-center gap-3 text-[14px] font-bold">
      <button onClick={toggle} aria-pressed={soundOn} className="flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100">
        <span aria-hidden className="flex h-3 items-end gap-[2px]">
          {[0.5, 1, 0.7].map((h, i) => (
            <span key={i} className={`w-[3px] rounded-full ${soundOn ? 'eq' : ''}`} style={{ height: `${soundOn ? h * 100 : 30}%`, background: 'var(--ink)', animationDelay: `${i * 0.18}s` }} />
          ))}
        </span>
        <span className="max-sm:hidden">{soundOn ? TRACKS[track].title : 'Sound off'}</span>
        <span className="sm:hidden">{soundOn ? 'Sound on' : 'Sound off'}</span>
      </button>
      {soundOn && (
        <button
          onClick={() => {
            const n = (track + 1) % TRACKS.length
            setTrack(n)
            sound.play(n)
          }}
          aria-label="Next song"
          className="opacity-60 transition-opacity hover:opacity-100 max-sm:hidden"
        >
          Next sound ›
        </button>
      )}
    </div>
  )
}

export default function Overlay() {
  const { ready, liveWordmark, game, setGame, soundOn, setSoundOn, setTrack } = useStore()
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState<number | null>(null)
  const [cert, setCert] = useState<Cert | null>(null)
  const activeRef = useRef(0)
  const pressTimer = useRef<number | undefined>(undefined)

  useEffect(() => restoreMode(), [])

  // Easter egg: type "panda" (or "snake", or ↑↑↓↓←→←→), or long-press the wordmark on a phone.
  useEffect(() => {
    let buf = ''
    let arrows = ''
    const CODE = 'UUDDLRLR'
    const ARROW: Record<string, string> = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' }
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || useStore.getState().game) return
      if (ARROW[e.key]) {
        arrows = (arrows + ARROW[e.key]).slice(-CODE.length)
        if (arrows === CODE) {
          arrows = ''
          setGame(true)
        }
        return
      }
      if (e.key.length !== 1) return
      buf = (buf + e.key.toLowerCase()).slice(-5)
      if (buf === 'panda' || buf === 'snake') {
        buf = ''
        setGame(true)
      }
    }
    window.addEventListener('keydown', onKey)
    console.log('%cCUROYO%c  Psst. Type "panda".', 'font-weight:700;letter-spacing:.2em', 'opacity:.6')
    return () => window.removeEventListener('keydown', onKey)
  }, [setGame])

  // Hovering text makes the 3D form swell behind it, and plays a note when sound is on.
  useEffect(() => {
    let last: Element | null = null
    const over = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target.closest('[data-react],a,button') : null
      live.pulse = el?.matches('[data-react]') ? 1 : 0
      if (el && el !== last) sound.pluck(hashText(el.textContent || ''))
      last = el
    }
    window.addEventListener('pointerover', over, { passive: true })
    return () => window.removeEventListener('pointerover', over)
  }, [])

  // The theme on screen follows the section you are in, blending as you scroll (or holds a chosen theme).
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let force = true
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      live.scrollVel *= Math.exp(-dt * 3)
      live.shake *= Math.exp(-dt * 4)
      if (stepTheme(SECTION_IDS, dt) || force) {
        force = false
        const m = live.theme
        const r = document.documentElement.style
        r.setProperty('--bg', m.bg)
        r.setProperty('--ink', m.ink)
        r.setProperty('--glow', m.glow)
        r.setProperty('--hot', m.light ? '#c8471b' : m.name === 'Night' ? '#6fd3ff' : '#ff7a3d')
        r.setProperty('--cur', m.light ? '#c8471b' : m.accent)
        r.setProperty('--logo-filter', m.light ? 'invert(1)' : 'none')
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', m.bg)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'))
    const update = () => {
      const y = window.scrollY + window.innerHeight * 0.5
      let i = 0
      els.forEach((el, k) => {
        if (el.offsetTop <= y) i = k
      })
      // The 3D form travels as a section's top rises to the top of the viewport, so it is settled on arrival.
      const top = window.scrollY
      let j = 0
      els.forEach((el, k) => {
        if (el.offsetTop <= top + 1) j = k
      })
      const nxt = els[j + 1]
      live.section = j + (nxt ? Math.min(1, Math.max(0, (top - els[j].offsetTop) / (nxt.offsetTop - els[j].offsetTop))) : 0)
      if (activeRef.current !== i) {
        activeRef.current = i
        setActive(i)
      }
    }
    let lastY = window.scrollY
    let lastT = performance.now()
    const onScroll = () => {
      const now = performance.now()
      const v = (window.scrollY - lastY) / Math.max(8, now - lastT)
      lastY = window.scrollY
      lastT = now
      live.scrollVel += (v * 1000 - live.scrollVel) * 0.35
      live.lastInput = now
      update()
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el))
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      io.disconnect()
    }
  }, [])

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return (
    <div className={`relative z-10 transition-opacity duration-[1600ms] ${ready ? 'opacity-100' : 'opacity-0'}`}>
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
        <button
          onClick={() => go('intro')}
          aria-label="CUROYO, back to top"
          className="transition-opacity duration-700"
          style={{ opacity: active === 0 ? 0 : 1, pointerEvents: active === 0 ? 'none' : 'auto' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wordmark.png" alt="" className="h-[18px] w-auto" style={{ filter: 'var(--logo-filter)' }} />
        </button>
        <nav aria-label="Primary" className="ml-auto flex gap-5 text-[15px] font-bold sm:gap-9">
          {NAV.map((n) => {
            const on = SECTION_IDS[active] === n.id || (n.id === 'about' && SECTION_IDS[active] === 'credentials')
            return (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                aria-current={on ? 'true' : undefined}
                className={`relative py-1 transition-opacity hover:opacity-100 focus-visible:opacity-100 ${n.id === 'play' ? 'max-sm:hidden' : ''} ${n.id === 'pricing' ? 'max-lg:hidden' : ''}`}
                style={{ opacity: on ? 1 : 0.6 }}
              >
                {n.label}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Progress: the logo's own spots, one per section. */}
      <ScrollLine />


      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-end justify-between gap-4 px-5 py-5 sm:px-10 sm:py-7">
        <SoundControl />
        <div className="pointer-events-auto flex items-center gap-5 sm:gap-6">
          <Gyro />
          <button onClick={() => setGame(true)} data-hover="Play" className="max-sm:hidden text-[14px] font-bold opacity-80 transition-opacity hover:opacity-100">
            Play
          </button>
          <ThemePicker />
        </div>
      </footer>

      <main>
        {/* INTRO: the wordmark is a live material; the snake does the moving. */}
        <section data-section id="intro" className="relative flex min-h-[100svh] flex-col items-center justify-end px-6 pb-[15vh] max-sm:pb-40">
          <h1 className="sr-only">CUROYO, by Simon Maxam. Ideas, built in 3D.</h1>
          {/* The image holds the wordmark's place; once the live particle wordmark is running it draws over this spot. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            id="wordmark-anchor"
            src="/wordmark.png"
            alt=""
            draggable={false}
            className="w-[min(78vw,620px)] select-none"
            style={{ opacity: liveWordmark ? 0 : 'var(--intro)', filter: 'var(--logo-filter)' }}
            onPointerDown={() => {
              pressTimer.current = window.setTimeout(() => setGame(true), 900)
            }}
            onPointerUp={() => window.clearTimeout(pressTimer.current)}
            onPointerLeave={() => window.clearTimeout(pressTimer.current)}
            onPointerCancel={() => window.clearTimeout(pressTimer.current)}
          />
          <p className="mt-6 text-[17px] font-semibold" style={{ color: 'var(--muted)', opacity: 'var(--intro)' }}>
            by Simon Maxam
          </p>
        </section>

        {/* EDEN: the oldest story about an idea: a red panda, an apple, a tree. */}
        <section data-section id="eden" className="flex min-h-[88svh] flex-col items-center justify-end px-6 pb-[12vh] max-sm:pb-52 text-center">
          <div className="reveal">
            <Label>In the beginning</Label>
            <h2 data-react data-live="eden" className="mt-6 font-display text-[clamp(48px,10vw,150px)] leading-[0.98] tracking-[-0.02em]">
              Every idea starts
              <br />with a question.
            </h2>
          </div>
        </section>

        {/* NEWTON: an idea passes from one thing to the next. */}
        <section data-section id="newton" className="flex min-h-[88svh] flex-col items-center justify-end px-6 pb-[12vh] max-sm:pb-52 text-center">
          <div className="reveal">
            <Label>Momentum</Label>
            <h2 data-react data-live="newton" className="mt-6 font-display text-[clamp(44px,9vw,136px)] leading-[0.98] tracking-[-0.02em]">
              An idea moves
              <br />
              from hand to hand.
            </h2>
          </div>
        </section>

        {/* The story passes quickly here: the form changes while you scroll. */}
        <section data-section id="idea" className="flex min-h-[78svh] items-center justify-center px-6 text-center">
          <p data-react data-live="idea" className="font-display text-[clamp(110px,24vw,380px)] leading-[0.82] tracking-[-0.03em]">Build<br />it.</p>
        </section>
        {/* THE DARK ROOM: the page goes dark and only what the cursor lights can be read. */}
        <section data-section id="form" className="relative flex min-h-[150svh] flex-col justify-center gap-[10svh] px-6 py-[14svh] sm:px-10" style={{ background: 'linear-gradient(to bottom, transparent, rgba(2,4,10,0.82) 16%, rgba(2,4,10,0.82) 84%, transparent)' }}>
          <p className="pointer-events-none mx-auto text-[13px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>It is dark in here. Bring light.</p>
          <Torch radius={230} dim={0.06} lit="var(--ink)" className="mx-auto w-full max-w-[1000px] text-center text-[clamp(30px,5.6vw,80px)] leading-[1.05] tracking-[-0.01em]" text="We make things you can walk into, hold, and play." />
          <div className="mx-auto grid w-full max-w-[1100px] gap-x-14 gap-y-[8svh] sm:grid-cols-2">
            <Torch radius={200} dim={0.06} className="text-left text-[clamp(22px,2.6vw,36px)] leading-[1.1]" text="Websites that feel like places." />
            <Torch radius={200} dim={0.06} lit="var(--ink)" className="text-left text-[clamp(22px,2.6vw,36px)] leading-[1.1] sm:mt-[10svh]" text="Details you only find by looking." />
            <Torch radius={200} dim={0.06} lit="var(--ink)" className="text-left text-[clamp(22px,2.6vw,36px)] leading-[1.1]" text="Particles with a purpose, not decoration." />
            <Torch radius={200} dim={0.06} className="text-left text-[clamp(22px,2.6vw,36px)] leading-[1.1] sm:mt-[10svh]" text="Built to be found by the curious." />
          </div>
          <Torch radius={260} dim={0.05} className="mx-auto w-full max-w-[1000px] text-center text-[clamp(48px,11vw,170px)] leading-[0.9] tracking-[-0.03em]" text="Look closer." />
        </section>

        {/* WORK */}
        <section data-section id="work">
          <HStrip length={2.2}>
            <div className="flex w-[78vw] shrink-0 flex-col justify-center sm:w-[30vw]">
              <Label>Selected work</Label>
              <p data-react className="mt-6 font-display text-[clamp(44px,6vw,92px)] leading-[0.95] tracking-[-0.02em]">Things we have shipped.</p>
              <p className="mt-6 text-[15px] font-bold" style={{ color: 'var(--muted)' }}>Keep scrolling. The strip moves sideways.</p>
            </div>
              {PROJECTS.map((p, i) => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-hover="Visit"
                  data-react
                  className="work-card group relative flex min-h-[420px] w-[78vw] shrink-0 flex-col justify-between sm:w-[34vw] sm:max-w-[480px]"
                  style={{ ['--brand' as string]: p.color } as CSSProperties}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="work-num font-display text-[clamp(90px,9vw,140px)] leading-[0.85]" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                    <CertObject kind={p.obj} size={170} />
                  </div>
                  <div>
                    <span className="inline-block rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ background: 'var(--brand)', color: '#14080a' }}>
                      Live · {p.kind}
                    </span>
                    <span className="mt-4 block font-display text-[clamp(38px,4.4vw,64px)] leading-[0.98]">{p.name}</span>
                    <p className="mt-3 text-[15px] font-semibold leading-snug" style={{ color: 'var(--muted)' }}>{p.text}</p>
                    <div className="mt-5 flex items-center justify-between gap-3 text-[13px] font-bold">
                      <span className="truncate" style={{ color: 'var(--muted)' }}>{p.host}</span>
                      <span className="work-go shrink-0 rounded-full px-4 py-2" style={{ background: 'var(--brand)', color: '#14080a' }}>Visit site ↗</span>
                    </div>
                  </div>
                </a>
              ))}
          </HStrip>
        </section>

        {/* STUDIO */}
        <section data-section id="studio" className="flex min-h-[95svh] flex-col items-center justify-end px-6 pb-[12vh] max-sm:pb-40 text-center sm:px-10">
          <div className="reveal w-full max-w-[960px]">
            <Label>Studio</Label>
            <h2 data-react data-live="studio" className="mt-8 font-display text-[clamp(34px,6vw,86px)] leading-[1.02] tracking-[-0.01em]">
              Spaces. Objects. Experiences.
            </h2>
            <div className="mt-12 grid gap-6 text-left sm:grid-cols-3">
              {[
                ['3D & visualization', 'Architecture, interiors, products.'],
                ['Interactive web', 'Sites you move through.'],
                ['Real-time worlds', 'Unreal Engine and WebGL.'],
              ].map(([t, d]) => (
                <div key={t} data-react className="hov" style={{ color: 'var(--muted)' }}>
                  <h3 className="text-[19px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{t}</h3>
                  <p className="mt-1 text-[15px] font-bold">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BEYOND: stars. */}
        <section data-section id="beyond" className="flex min-h-[85svh] flex-col items-center justify-end px-6 pb-[14vh] max-sm:pb-52 text-center">
          <p data-react data-live="beyond" className="reveal font-display text-[clamp(44px,9vw,140px)] leading-[0.98] tracking-[-0.02em]">Some ideas are<br />bigger than a room.</p>
        </section>

        {/* PANDA: the new mascot. */}
        <section data-section id="panda" className="flex min-h-[85svh] items-end justify-start px-6 pb-[14vh] max-sm:pb-40 sm:items-center sm:px-10 sm:pb-0">
          <div className="reveal w-full max-w-[min(520px,42vw)] max-lg:max-w-[620px] max-lg:text-center">
            <Label>Small, rare, curious</Label>
            <h2 data-react className="spotty mt-8 font-display text-[clamp(36px,5.4vw,78px)] leading-[1.02] tracking-[-0.01em]">
              Meet the <span className="panda-word">red panda.</span>
            </h2>
            <p data-react className="hov mt-6 text-[18px] font-bold leading-snug" style={{ color: 'var(--muted)' }}>
              It climbs where others will not and looks at the world from above. We build the same way: patient, playful, and a little out of reach.
            </p>
            <p className="mt-5 text-[14px] font-bold" style={{ color: 'var(--muted)' }}>
              Its bamboo grows here, cane by cane. Stir it with your cursor, or tilt your phone. Watch out: the panda eats the cane.
            </p>
          </div>
        </section>

        {/* PLAY: live pieces of what we build for clients. */}
        <section data-section id="play" className="px-5 py-28 sm:px-10">
          <div className="reveal mx-auto w-full max-w-[1180px]">
            <Label>Try it</Label>
            <h2 data-react data-live="build" className="mt-6 font-display text-[clamp(34px,5.4vw,78px)] leading-[1.02] tracking-[-0.01em]">What we can build for you.</h2>
            <p className="mt-5 max-w-[640px] text-[17px] font-bold leading-snug" style={{ color: 'var(--muted)' }}>A real build first, then eight things clients ask us for, all live. Try them.</p>
            <div className="mt-12">
              <PizzaShowcase />
            </div>
            <div className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4 lg:gap-5">
              {DEMOS.map((d, di) => (
                <div key={d.title} className="issuer-pop group flex w-[78vw] shrink-0 snap-center flex-col sm:w-auto" style={{ ['--brand' as string]: d.color } as CSSProperties}>
                  <div className="h-[330px] w-full transition-transform duration-500 group-hover:-translate-y-1.5" style={{ borderRadius: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
                    {d.el}
                  </div>
                  <div className="pt-4" style={{ borderTop: '1.5px solid var(--line)', marginTop: 16 }}>
                    <p className="flex items-center gap-2.5">
                      <span className="issuer-num font-display text-[34px] leading-none" style={{ minWidth: 0, WebkitTextStrokeWidth: '1.5px' }}>{String(di + 1).padStart(2, '0')}</span>
                      <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.14em]" style={{ background: 'var(--brand)', color: '#14080a' }}>{d.tag}</span>
                    </p>
                    <h3 className="mt-2.5 font-display text-[22px] leading-[1.05]">{d.title}</h3>
                    <p className="mt-1.5 text-[14px] font-bold leading-snug" style={{ color: 'var(--muted)' }}>{d.line}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section data-section id="pricing" className="flex min-h-[95svh] gap-8 items-center px-6 py-28 sm:px-10 max-lg:flex-col max-lg:items-end max-lg:pt-[58vh]">
          <div className="reveal w-full max-w-[min(660px,50vw)] max-lg:max-w-[680px] lg:flex-1">
            <Label>Pricing</Label>
            <h2 data-react data-live="pricing" className="mt-6 mb-8 font-display text-[clamp(34px,5vw,72px)] leading-[1.02] tracking-[-0.01em]">Plans that grow with you.</h2>
            <Pricing />
          </div>
        </section>

        {/* ABOUT */}
        <section data-section id="about" className="relative flex min-h-[130svh] flex-col items-center justify-end px-6 pb-[10vh] pt-[60vh] text-center sm:px-10">
          <AboutSides />
          <div className="reveal relative z-10 w-full max-w-[860px]">
            <Label>About</Label>
            <h2 data-react className="spotty mt-6 font-display text-[clamp(44px,7vw,104px)] leading-none tracking-[-0.01em]">Simon Maxam</h2>
            <p className="mx-auto mt-5 max-w-[620px] text-[18px] font-bold leading-snug" style={{ color: 'var(--muted)' }}>
              Founder of CUROYO. I build interactive 3D websites, products and games, and I play guitar on stage the same way I code: patient, then suddenly fast.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-3 text-left">
              {[
                ['27', 'certificates'],
                ['5', 'disciplines'],
                ['7', 'years of guitar'],
              ].map(([n, l]) => (
                <div key={l} className="rounded-[20px] px-5 py-4" style={{ background: 'color-mix(in srgb, var(--hot) 14%, var(--bg))' }}>
                  <div className="font-display text-[clamp(34px,5vw,60px)] leading-none" style={{ color: 'var(--hot)' }}>{n}</div>
                  <div className="mt-1 text-[13px] font-bold" style={{ color: 'var(--muted)' }}>{l}</div>
                </div>
              ))}
            </div>
            <dl className="mt-8 grid gap-3 text-left sm:grid-cols-2">
              {DISCIPLINES.map((d) => (
                <div key={d.name} data-react className="hov rounded-[20px] px-5 py-4" style={{ boxShadow: 'inset 0 0 0 1.5px var(--line)' }}>
                  <dt className="text-[18px] font-bold tracking-[-0.01em]">{d.name}</dt>
                  <dd className="mt-1 text-[14px] font-bold" style={{ color: 'var(--muted)' }}>{d.text}</dd>
                </div>
              ))}
            </dl>
            <button
              onClick={async () => {
                if (!soundOn) {
                  setTrack(1)
                  await sound.enable(1)
                  setSoundOn(true)
                }
              }}
              data-hover="Listen"
              className="mt-10 inline-flex items-center gap-3 rounded-full px-5 py-2.5 text-[15px] font-bold"
              style={{ background: 'var(--hot)', color: '#1a0a05' }}
            >
              {soundOn ? 'Playing my music: watch the particles' : 'Hear my music'}
            </button>
          </div>
        </section>

        {/* CREDENTIALS */}
        <section data-section id="credentials" className="px-6 py-32 sm:px-10">
          <div className="reveal mx-auto w-full max-w-[1000px]">
            <Label>Credentials</Label>
            <Credentials onOpen={setCert} />
          </div>
        </section>

        {/* CONTACT: the Himalaya rises behind it. */}
        <section data-section id="contact" className="flex min-h-[85svh] flex-col items-center justify-end px-6 pb-[14vh] pt-[40vh] max-sm:pb-40">
          <div className="reveal w-full">
            <Contact email={CONTACT_EMAIL} />
          </div>
        </section>
      </main>

      <Lightbox cert={cert} onClose={() => setCert(null)} />
      <EdenLife />
      <MountainLife />
      <HoverWords />
      {game && <SnakeGame onClose={() => setGame(false)} />}
    </div>
  )
}
