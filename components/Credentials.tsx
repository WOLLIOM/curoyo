'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { haptic } from '@/lib/phone'
import { hashText, sound } from '@/lib/sound'
import CertObject, { type ObjKind } from './CertObject'

const OBJ: Record<string, ObjKind> = {
  'aws-cloud-solutions-architect': 'cloud',
  'ibm-ai-engineering': 'neural',
  'google-it-automation-python': 'python',
  'google-business-intelligence': 'chart',
  'github-pm': 'git',
  'cpp-advanced': 'cpp',
  'data-analysis-microsoft': 'data',
  'ai-foundations-ml': 'neural',
  'amazon-bedrock': 'cloud',
}

// No certificate images sit on the page: each issuer is drawn in its own colours and type,
// and the real document only appears when you open one.

type IssuerId = 'aws' | 'ibm' | 'google' | 'microsoft' | 'adobe' | 'siemens' | 'github' | 'linkedin' | 'london'

const ISSUER: Record<IssuerId, { name: string; color: string; line: string }> = {
  aws: { name: 'Amazon Web Services', color: '#ffb11f', line: 'Cloud and generative AI' },
  ibm: { name: 'IBM', color: '#5c8dff', line: 'AI engineering' },
  google: { name: 'Google', color: '#3ddc84', line: 'Automation and data' },
  microsoft: { name: 'Microsoft', color: '#2ea8ff', line: 'Data analysis' },
  adobe: { name: 'Adobe', color: '#ff4a3d', line: 'Photoshop, Illustrator, Premiere Pro' },
  siemens: { name: 'Siemens', color: '#19d3b5', line: 'Engineering design in NX' },
  github: { name: 'GitHub', color: '#a78bfa', line: 'Project management and collaboration' },
  london: { name: 'University of London', color: '#ff5fa2', line: 'Royal Central School of Speech and Drama' },
  linkedin: { name: 'LinkedIn Learning', color: '#4aa3ff', line: '3D, code, AI, data and business' },
}

export interface Cert {
  title: string
  img: string
  issuer: IssuerId
  short?: string
  date?: string
  courses?: number
  text?: string
  skills?: string[]
  // A card's own colours and look when the issuer's are not enough (two Google programs on different subjects).
  brand?: string
  brand2?: string
  look?: 'code' | 'biz'
}

const PROFESSIONAL: Cert[] = [
  {
    issuer: 'aws',
    title: 'AWS Cloud Solutions Architect',
    img: 'aws-cloud-solutions-architect',
    courses: 4,
    date: 'Sep 2026',
    text: 'Design and build secure, scalable systems in the cloud on AWS, from the basics to exam prep.',
    skills: ['Architecture', 'EC2', 'S3', 'IAM', 'VPC'],
  },
  {
    issuer: 'ibm',
    title: 'IBM AI Engineering',
    img: 'ibm-ai-engineering',
    courses: 13,
    date: 'Sep 2026',
    text: 'Build, fine-tune and deploy deep learning models and LLMs.',
    skills: ['PyTorch', 'TensorFlow', 'Keras', 'LangChain', 'RAG'],
  },
  {
    issuer: 'google',
    title: 'Google IT Automation with Python',
    img: 'google-it-automation-python',
    courses: 7,
    date: 'Sep 2026',
    text: 'Automate real IT work with Python: scripting, Git, troubleshooting and systems at scale in the cloud.',
    skills: ['Python', 'Git', 'Bash', 'Automation', 'Cloud'],
    brand: '#4b8bbe',
    brand2: '#ffd43b',
    look: 'code',
  },
  {
    issuer: 'google',
    title: 'Google Business Intelligence',
    img: 'google-business-intelligence',
    courses: 4,
    date: 'Sep 2026',
    text: 'Turn raw data into dashboards and decisions.',
    skills: ['SQL', 'BigQuery', 'Tableau', 'Dashboards', 'Data modeling'],
    brand: '#fbbc04',
    brand2: '#34a853',
    look: 'biz',
  },
]

const COURSES: Cert[] = [
  { issuer: 'aws', short: 'Amazon Bedrock', title: 'Amazon Bedrock Customization, Optimization & Automation', date: 'Sep 2026', img: 'amazon-bedrock' },
  { issuer: 'aws', short: 'Solutions Architect exam prep', title: 'Exam Prep: AWS Certified Solutions Architect – Associate', date: 'Sep 2026', img: 'aws-solutions-architect-prep' },
  { issuer: 'adobe', short: 'Photoshop', title: 'Essential Skills in Adobe Photoshop 2025', date: 'Aug 2026', img: 'adobe-photoshop' },
  { issuer: 'adobe', short: 'Illustrator', title: 'Essential Skills in Adobe Illustrator 2025', date: 'Aug 2026', img: 'adobe-illustrator' },
  { issuer: 'adobe', short: 'Premiere Pro', title: 'Essential Skills in Adobe Premiere Pro 2025', date: 'Aug 2026', img: 'adobe-premiere' },
  { issuer: 'microsoft', short: 'Data Analysis', title: 'Career Essentials in Data Analysis by Microsoft and LinkedIn', date: 'Aug 2026', img: 'data-analysis-microsoft' },
  { issuer: 'siemens', short: 'NX Mastery', title: 'Siemens NX Mastery: Advanced Design & Applications', date: 'Sep 2026', img: 'siemens-nx-mastery' },
  { issuer: 'github', short: 'Project management', title: 'Practical GitHub Project Management and Collaboration', date: 'Aug 2026', img: 'github-pm' },
  { issuer: 'london', short: 'Discover Acting', title: 'Discover Acting, Royal Central School of Speech and Drama', date: 'Sep 2026', img: 'discover-acting' },
  { issuer: 'linkedin', short: 'Revit to Unreal', title: 'Revit to Unreal for Architecture, Visualization, and VR', date: 'Aug 2026', img: 'revit-to-unreal' },
  { issuer: 'linkedin', short: 'Revit for MEP', title: 'Revit 2023: Essential Training for MEP', date: 'Aug 2026', img: 'revit-2023-mep' },
  { issuer: 'linkedin', short: 'Unreal lighting', title: 'Unreal: Introduction to Lighting', date: 'Aug 2026', img: 'unreal-lighting' },
  { issuer: 'linkedin', short: 'Blender 4', title: 'Blender 4.0 Essential Training', date: 'Aug 2026', img: 'blender-4' },
  { issuer: 'linkedin', short: 'HTML, CSS & JavaScript', title: 'HTML, CSS, and JavaScript: Building the Web', date: 'Aug 2026', img: 'html-css-js' },
  { issuer: 'linkedin', short: 'Advanced C++', title: 'C++ Development: Advanced Concepts, Lambda Expressions, and Best Practices', date: 'Aug 2026', img: 'cpp-advanced' },
  { issuer: 'linkedin', short: 'Advanced SEO', title: 'Advanced SEO: Developing an SEO-Friendly Website', date: 'Jul 2026', img: 'advanced-seo' },
  { issuer: 'linkedin', short: 'Machine learning', title: 'Artificial Intelligence Foundations: Machine Learning', date: 'Aug 2026', img: 'ai-foundations-ml' },
  { issuer: 'linkedin', short: 'AI agents for security', title: 'AI Agents for Cybersecurity', date: 'Aug 2026', img: 'ai-agents-cybersecurity' },
  { issuer: 'linkedin', short: 'Prompt engineering', title: 'Prompt Engineering: How to Talk to the AIs', date: 'Aug 2026', img: 'prompt-engineering' },
  { issuer: 'linkedin', short: 'Data analytics', title: 'Data Analytics for Business Professionals (IIBA)', date: 'Aug 2026', img: 'data-analytics-business' },
  { issuer: 'linkedin', short: 'Python for finance', title: 'Getting Started with Python for Finance', date: 'Aug 2026', img: 'python-finance' },
  { issuer: 'linkedin', short: 'Project management', title: 'Project Management Foundations (PMI)', date: 'Aug 2026', img: 'project-management' },
  { issuer: 'linkedin', short: 'Solution sales', title: 'Solution Sales', date: 'Aug 2026', img: 'solution-sales' },
]

const RECOGNITION = [
  { title: 'TÜBİTAK', place: '3rd', line: '3rd place nationwide in Türkiye, 1st in the province', year: '2024' },
  { title: 'Waterloo Newtonian Medal', place: 'Medal', line: 'University of Waterloo, Centre for Education in Mathematics and Computing', year: '' },
]

const ORDER: IssuerId[] = ['london', 'siemens', 'github', 'microsoft', 'aws', 'adobe', 'linkedin']
const FIRST = 4 // issuer groups shown before "Show more"
const TOTAL = PROFESSIONAL.length + COURSES.length
const HIDDEN = ORDER.slice(FIRST).reduce((n, id) => n + COURSES.filter((c) => c.issuer === id).length, 0)

// Counts up once the number scrolls into view.
function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const run = (now: number) => {
        const k = Math.min(1, (now - t0) / 1400)
        setV(Math.round(to * (1 - Math.pow(1 - k, 3))))
        if (k < 1) raf = requestAnimationFrame(run)
      }
      raf = requestAnimationFrame(run)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to])
  return <span ref={ref}>{v}</span>
}

// Letters that jump one after another when their card is touched.
function Letters({ text, colors }: { text: string; colors?: string[] }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <span key={i} className="mark-l" style={{ ['--i' as string]: i, color: colors?.[i % colors.length] } as CSSProperties}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </>
  )
}

// Each issuer's name set in its own colours, with one small motion of its own.
export function Mark({ id, size = 40 }: { id: IssuerId; size?: number }) {
  const c = ISSUER[id].color
  const base = 'mark inline-flex items-center whitespace-nowrap font-display leading-none'
  const style: CSSProperties = { fontSize: size }
  switch (id) {
    case 'google':
      return (
        <span className={base} style={style} aria-label="Google">
          <Letters text="Google" colors={['#4c8dff', '#ff4a3d', '#ffb11f', '#4c8dff', '#3ddc84', '#ff4a3d']} />
        </span>
      )
    case 'aws':
      return (
        <span className={`${base} relative flex-col items-start`} style={style} aria-label="AWS">
          <span style={{ color: 'var(--ink)' }}>
            <Letters text="aws" />
          </span>
          <svg viewBox="0 0 60 14" className="aws-smile -mt-[0.12em] w-[1.5em]" aria-hidden>
            <path d="M3 3 Q30 15 54 4 M47 2 L55 4 L52 10" fill="none" stroke={c} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )
    case 'ibm':
      return (
        <span className={`${base} ibm-stripes tracking-[0.04em]`} style={{ ...style, color: c }} aria-label="IBM">
          IBM
        </span>
      )
    case 'microsoft':
      return (
        <span className={`${base} gap-[0.28em]`} style={style} aria-label="Microsoft">
          <span className="ms-grid grid grid-cols-2" aria-hidden>
            {['#ff5a1f', '#7fd13b', '#2ea8ff', '#ffb900'].map((k, n) => (
              <span key={n} className="block h-[0.36em] w-[0.36em]" style={{ background: k }} />
            ))}
          </span>
          <span style={{ color: 'var(--ink)' }}>
            <Letters text="Microsoft" />
          </span>
        </span>
      )
    case 'linkedin':
      return (
        <span className={`${base} gap-[0.12em]`} style={style} aria-label="LinkedIn Learning">
          <span style={{ color: 'var(--ink)' }}>
            <Letters text="Linked" />
          </span>
          <span className="mark-l rounded-[0.12em] px-[0.1em]" style={{ background: c, color: '#1a0a05', ['--i' as string]: 6 } as CSSProperties}>
            in
          </span>
          <span className="ml-[0.2em] text-[0.55em] opacity-70">Learning</span>
        </span>
      )
    case 'london':
      return (
        <span className={`${base} font-serif italic`} style={{ ...style, color: c, fontFamily: 'Georgia, serif', fontSize: size * 0.8 }} aria-label="University of London">
          <Letters text="Univ. of London" />
        </span>
      )
    case 'siemens':
      return (
        <span className={`${base} tracking-[0.08em]`} style={{ ...style, color: c }} aria-label="Siemens">
          <Letters text="SIEMENS" />
        </span>
      )
    default:
      return (
        <span className={base} style={{ ...style, color: id === 'github' ? 'var(--ink)' : c }} aria-label={ISSUER[id].name}>
          <Letters text={ISSUER[id].name} />
        </span>
      )
  }
}

// Cards light up in their issuer's colour where the pointer is.
const glow = (e: React.PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

function Seal({ id, color }: { id: string; color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="seal h-[74px] w-[74px] shrink-0" aria-hidden>
      <defs>
        <path id={`seal-${id}`} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
      </defs>
      <g className="seal-spin">
        <text fontSize="10.5" fontWeight="800" letterSpacing="1.6" fill="currentColor">
          <textPath href={`#seal-${id}`}>PROFESSIONAL · VERIFIED ·</textPath>
        </text>
      </g>
      <circle cx="50" cy="50" r="22" fill={color} />
      <path d="M40 50 l7 7 l14 -15" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// The skills line speaks the program's language: a line of Python for the automation one, dashboard filters for
// the business one, a plain list for the rest.
function Skills({ c }: { c: Cert }) {
  const s = c.skills ?? []
  if (c.look === 'code')
    return (
      <span className="mt-4 inline-block rounded-lg px-3 py-2 font-mono text-[13px] font-bold" style={{ background: 'color-mix(in srgb, var(--brand) 16%, transparent)' }}>
        <span style={{ color: 'var(--muted)' }}>&gt;&gt;&gt; </span>
        <span style={{ color: 'var(--brand2)' }}>import</span> {s.map((k) => k.toLowerCase()).join(', ')}
        <span className="code-caret" style={{ color: 'var(--brand2)' }}>▍</span>
      </span>
    )
  if (c.look === 'biz')
    return (
      <span className="mt-4 flex flex-wrap gap-2">
        {s.map((k, i) => (
          <span key={k} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-extrabold" style={{ boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--brand) 55%, transparent)' }}>
            <span className="inline-block h-[9px] w-[3px] rounded-sm" style={{ background: i % 2 ? 'var(--brand2)' : 'var(--brand)' }} />
            {k}
          </span>
        ))}
      </span>
    )
  return (
    <span className="mt-4 block text-[13px] font-bold" style={{ color: 'var(--muted)' }}>
      {s.join(' · ')}
    </span>
  )
}

function Lead({ c, onOpen }: { c: Cert; onOpen: (c: Cert) => void }) {
  return (
    <button
      data-hover="Open"
      onClick={() => {
        onOpen(c)
        haptic(10)
      }}
      onPointerEnter={() => sound.pluck(hashText(c.title))}
      className="issuer-card issuer-pop group grid w-full grid-cols-[auto_1fr] items-start gap-x-6 gap-y-4 py-8 text-left sm:grid-cols-[auto_1fr_auto] sm:gap-x-10"
      style={{ ['--brand' as string]: c.brand ?? ISSUER[c.issuer].color, ['--brand2' as string]: c.brand2 } as CSSProperties}
    >
      <span className="issuer-num font-display text-[clamp(64px,9vw,128px)] leading-[0.8]">{c.courses}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-4">
          <Mark id={c.issuer} size={26} />
          <span className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
            {c.courses} courses · {c.date}
          </span>
        </span>
        <span className="mt-3 inline-block rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ background: 'var(--brand)', color: '#14080a' }}>
          ★ Professional Certificate
        </span>
        <span className="mt-3 block font-display text-[clamp(28px,3.4vw,48px)] leading-[1.02]">{c.title}</span>
        <span className="mt-3 block max-w-[52ch] text-[16px] font-bold leading-snug" style={{ color: 'var(--muted)' }}>
          {c.text}
        </span>
        <Skills c={c} />
      </span>
      <span className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end sm:self-center">
        {OBJ[c.img] && <CertObject kind={OBJ[c.img]} size={150} />}
        <span className="issuer-go text-[14px] font-bold">See certificate ↗</span>
      </span>
    </button>
  )
}

function Medal({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 64 84" className="h-[84px] w-[64px] shrink-0" aria-hidden>
      <path d="M18 2 L32 30 L46 2 L56 2 L40 36 L24 36 L8 2 Z" fill="var(--hot)" opacity="0.85" />
      <circle cx="32" cy="56" r="25" fill="none" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="32" cy="56" r="19" fill="var(--ink)" />
      <text x="32" y="61" textAnchor="middle" fontSize={label.length > 3 ? 10 : 15} fontWeight="800" fill="var(--bg)">
        {label}
      </text>
    </svg>
  )
}

function IssuerGroup({ id, onOpen }: { id: IssuerId; onOpen: (c: Cert) => void }) {
  const list = COURSES.filter((c) => c.issuer === id)
  const col = ISSUER[id].color
  return (
    <div className="issuer-pop plan-in" style={{ ['--brand' as string]: col } as CSSProperties}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-4" style={{ borderBottom: '1.5px solid var(--line)' }}>
        <Mark id={id} size={30} />
        <span className="text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>
          {ISSUER[id].line}
        </span>
        <span className="ml-auto text-[13px] font-bold" style={{ color: col }}>
          {list.length} {list.length === 1 ? 'certificate' : 'certificates'}
        </span>
      </div>
      <ul className="grid sm:grid-cols-2 sm:gap-x-8">
        {list.map((c) => (
          <li key={c.img}>
            <button
              data-hover="Open"
              onClick={() => {
                onOpen(c)
                haptic(8)
              }}
              onPointerEnter={() => sound.pluck(hashText(c.title))}
              className="course-row group flex w-full items-baseline justify-between gap-4 py-3.5 text-left"
            >
              <span className="min-w-0">
                <span className="block text-[18px] font-bold leading-tight">{c.short}</span>
                <span className="mt-0.5 block truncate text-[13px] font-bold" style={{ color: 'var(--muted)' }}>
                  {c.title}
                </span>
              </span>
              {OBJ[c.img] && <CertObject kind={OBJ[c.img]} size={72} />}
              <span className="shrink-0 text-[13px] font-bold" style={{ color: 'var(--muted)' }}>
                {c.date} <span className="course-arrow inline-block">↗</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Credentials({ onOpen }: { onOpen: (c: Cert) => void }) {
  const [more, setMore] = useState(false)
  const groups = more ? ORDER : ORDER.slice(0, FIRST)

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="grid items-end gap-8 lg:grid-cols-[auto_1fr]">
        <p data-react className="font-display leading-[0.85] tracking-[-0.03em]">
          <span className="block text-[clamp(110px,20vw,260px)]" style={{ color: 'var(--hot)' }}>
            <Counter to={TOTAL} />
          </span>
          <span className="block text-[clamp(34px,5vw,64px)]">certificates.</span>
        </p>
        <div className="pb-3">
          <p className="text-[clamp(18px,1.8vw,22px)] font-bold leading-snug">
            {PROFESSIONAL.length} professional certificates, {COURSES.length} specialist courses and {RECOGNITION.length} awards. Open any of them to see the real certificate.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-4">
            {(['aws', 'ibm', 'google', 'microsoft', 'adobe', 'siemens'] as IssuerId[]).map((id) => (
              <span key={id} className="issuer-pop">
                <Mark id={id} size={24} />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* The heavyweights: full multi-course programs. */}
      <p className="mt-20 text-[13px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        Professional certificates · full programs, not single classes
      </p>
      <div className="issuer-list mt-6">
        {PROFESSIONAL.map((c) => (
          <Lead key={c.img} c={c} onOpen={onOpen} />
        ))}
      </div>

      <div className="grid sm:grid-cols-2 sm:gap-x-10">
        {RECOGNITION.map((r) => (
          <div key={r.title} data-react className="flex items-center gap-6 py-6" style={{ borderTop: '1.5px solid var(--line)' }}>
            <Medal label={r.place} />
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--hot)' }}>Award{r.year ? ` · ${r.year}` : ''}</p>
              <p className="mt-1 font-display text-[clamp(26px,3vw,40px)] leading-[1.05]">{r.title}</p>
              <p className="mt-1 text-[14px] font-bold" style={{ color: 'var(--muted)' }}>{r.line}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Specialist courses, by who issued them. */}
      <p className="mt-24 text-[13px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        Specialist courses
      </p>
      <div className="mt-8 grid gap-14">
        {groups.map((id) => (
          <IssuerGroup key={id} id={id} onOpen={onOpen} />
        ))}
      </div>
      <button
        onClick={() => {
          setMore(!more)
          sound.pluck(hashText(more ? 'less' : 'more'))
        }}
        aria-expanded={more}
        className="mt-12 rounded-full px-6 py-3 text-[15px] font-bold transition-transform hover:scale-105"
        style={{ background: 'var(--ink)', color: 'var(--bg)' }}
      >
        {more ? 'Show fewer' : `Show ${HIDDEN} more`}
      </button>
    </div>
  )
}
