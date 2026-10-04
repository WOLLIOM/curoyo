'use client'

import { useEffect, useRef, useState } from 'react'
import { live } from '@/lib/store'
import { haptic } from '@/lib/phone'
import { hashText, sound } from '@/lib/sound'

// Prices are in Canadian dollars. Edit this list to change the plans: the section builds itself from it.
// Each plan has a form that grows with it: an apple, a tree, a planet, a galaxy.
interface Plan {
  name: string
  form: string
  badge?: string
  blurb: string
  includes: string[]
  options: { team: string; price: number }[]
}

const PLANS: Plan[] = [
  {
    name: 'Independent',
    form: 'an idea',
    blurb: 'For independent creators and founders.',
    includes: ['A focused one-page site', 'Mobile-first design', 'Light interactive 3D', 'Source files and handover'],
    options: [{ team: '1 person', price: 169 }],
  },
  {
    name: 'Studio',
    form: 'a tree',
    badge: 'Most selected',
    blurb: 'Built for growing studios and agencies.',
    includes: ['Everything in Independent', 'Multi-page site', 'Custom 3D models and visualization', 'Phone motion and touch features'],
    options: [
      { team: 'Up to 10 people', price: 349 },
      { team: 'Up to 25 people', price: 549 },
      { team: 'Up to 75 people', price: 949 },
    ],
  },
  {
    name: 'Company',
    form: 'a world',
    blurb: 'The one-stop plan for growing companies.',
    includes: ['Everything in Studio', 'Product and brand experiences', 'Real-time 3D scenes', 'SEO and performance tuning', 'Ongoing support'],
    options: [
      { team: 'Up to 150 people', price: 1599 },
      { team: 'Up to 500 people', price: 2999 },
      { team: 'Up to 1,500 people', price: 5999 },
    ],
  },
  {
    name: 'Enterprise',
    form: 'a universe',
    blurb: 'For global brands operating at scale.',
    includes: ['Everything in Company', 'Worldwide, multi-language rollout', 'Unreal Engine and XR options', 'Procurement and legal support', 'A dedicated team'],
    options: [
      { team: 'Up to 2,500 people', price: 8999 },
      { team: 'Up to 5,000 people', price: 14999 },
      { team: 'Up to 7,500 people', price: 18999 },
    ],
  },
]

const fmt = (n: number) => Math.round(n).toLocaleString('en-CA')

// The number counts to its new value instead of jumping.
function useCount(target: number) {
  const [v, setV] = useState(target)
  const cur = useRef(target)
  useEffect(() => {
    let raf = 0
    const from = cur.current
    const t0 = performance.now()
    const run = (now: number) => {
      const k = Math.min(1, (now - t0) / 700)
      const e = 1 - Math.pow(1 - k, 3)
      cur.current = from + (target - from) * e
      setV(cur.current)
      if (k < 1) raf = requestAnimationFrame(run)
    }
    raf = requestAnimationFrame(run)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return v
}

export default function Pricing() {
  const [pi, setPi] = useState(1)
  const [oi, setOi] = useState(1)
  const plan = PLANS[pi]
  const picked = plan.options[Math.min(oi, plan.options.length - 1)]
  const shown = useCount(picked.price)

  // The 3D form on the other side of the screen follows the plan.
  useEffect(() => {
    live.plan = pi
    return () => {
      live.plan = 1
    }
  }, [pi])

  const choose = (i: number) => {
    setPi(i)
    setOi(i === 1 ? 1 : 0)
    haptic(10)
    sound.pluck(hashText(PLANS[i].name))
  }

  return (
    <div className="max-w-[640px]">
      <div role="tablist" aria-label="Plans" className="flex flex-wrap gap-x-5 gap-y-1">
        {PLANS.map((p, i) => {
          const on = i === pi
          return (
            <button
              key={p.name}
              role="tab"
              aria-selected={on}
              data-hover={on ? '' : 'Show'}
              onClick={() => choose(i)}
              className="group relative py-1 text-left"
            >
              <span
                className="font-display text-[clamp(24px,3.4vw,42px)] leading-[1.15] tracking-[-0.01em] transition-colors duration-500"
                style={{ color: on ? 'var(--ink)' : 'color-mix(in srgb, var(--ink) 38%, transparent)' }}
              >
                {p.name}
              </span>
              {p.badge && (
                <span aria-label={p.badge} title={p.badge} className="ml-1.5 inline-block h-[9px] w-[9px] rounded-full align-top" style={{ background: 'var(--ink)' }} />
              )}
            </button>
          )
        })}
      </div>

      <div key={plan.name} className="plan-in mt-7">
        <p className="text-[17px] font-bold" style={{ color: 'var(--muted)' }}>
          {plan.badge ? `${plan.badge}. ` : ''}{plan.blurb} <span className="whitespace-nowrap">Shown as {plan.form}.</span>
        </p>
        <ul className="mt-5 space-y-2.5">
          {plan.includes.map((t) => (
            <li key={t} className="flex gap-3 text-[16px] font-bold leading-snug">
              <span aria-hidden className="mt-[5px] inline-block h-[12px] w-[7px] shrink-0 -rotate-[14deg] rounded-full" style={{ background: 'var(--ink)' }} />
              {t}
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[14px] font-bold" style={{ color: 'var(--muted)' }}>Made for teams of</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {plan.options.map((o, i) => {
            const on = i === Math.min(oi, plan.options.length - 1)
            return (
              <button
                key={o.team}
                data-hover="Select"
                aria-pressed={on}
                onClick={() => {
                  setOi(i)
                  haptic(8)
                  sound.pluck(hashText(o.team))
                }}
                className="rounded-full px-4 py-2.5 text-[14px] font-bold transition-colors duration-300"
                style={{
                  background: on ? 'var(--ink)' : 'transparent',
                  color: on ? 'var(--bg)' : 'var(--ink)',
                  boxShadow: on ? 'none' : 'inset 0 0 0 1.5px color-mix(in srgb, var(--ink) 50%, transparent)',
                }}
              >
                {o.team}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-9 flex flex-wrap items-end gap-x-8 gap-y-5">
        <div>
          <p className="font-display text-[clamp(52px,8vw,104px)] leading-[0.95] tracking-[-0.02em]">
            <span className="text-[0.5em] align-top">CA$</span>
            {fmt(shown)}
          </p>
          <p className="mt-1 text-[14px] font-bold" style={{ color: 'var(--muted)' }}>
            {plan.name} · {picked.team} · Canadian dollars
          </p>
        </div>
        <button
          data-hover="Start"
          onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
          className="mb-1 rounded-full px-7 py-3.5 text-[16px] font-bold"
          style={{ background: 'var(--ink)', color: 'var(--bg)' }}
        >
          Start a project
        </button>
      </div>
      <p className="mt-5 text-[14px] font-bold" style={{ color: 'var(--muted)' }}>We work with clients around the world.</p>
    </div>
  )
}
