// Sound starts on the first touch or key press (browsers forbid earlier) unless the visitor switched it off. When on, a generated Himalayan bamboo forest (the red panda's home) plays,
// with Simon's own music on top when chosen, and the scene listens. Hovering text plays soft notes,
// and moving through the particles brushes air and knocks bamboo.

// The first "track" is no recording at all: a live, generated red panda habitat.
export const TRACKS = [
  { title: 'Soft keys', src: '', amb: 'keys' },
  { title: 'Night pond', src: '', amb: 'pond' },
  { title: 'Rain drops', src: '', amb: 'rain' },
  { title: 'Deep drone', src: '', amb: 'drone' },
  { title: 'Himalayan bamboo forest', src: '', amb: 'forest' },
  { title: 'Replay', src: '/audio/replay.mp3' },
  { title: 'Freedom Rises', src: '/audio/freedom-rises.mp3' },
  { title: 'The Greatest Gift', src: '/audio/the-greatest-gift.mp3' },
  { title: 'The Trumpets Sound', src: '/audio/the-trumpets-sound.mp3' },
  { title: '1', src: '/audio/1.mp3' },
]

const SCALE = [0, 2, 4, 7, 9]

class Sound {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private music: HTMLAudioElement | null = null
  private musicGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private data: Uint8Array<ArrayBuffer> | null = null
  private air: GainNode | null = null
  private amb: Record<string, GainNode> = {}
  private cur = 'keys'
  private musicOn = false
  private noiseBuf: AudioBuffer | null = null
  private lastKnock = 0
  private smooth = 0
  private lastPluck = 0
  on = false
  track = 0
  onTrackEnd: (() => void) | null = null

  private ensure() {
    if (this.ctx) return this.ctx
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    const music = new Audio()
    music.crossOrigin = 'anonymous'
    music.preload = 'none'
    music.addEventListener('ended', () => this.onTrackEnd?.())
    const src = ctx.createMediaElementSource(music)
    const musicGain = ctx.createGain()
    musicGain.gain.value = 0.55
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82
    src.connect(analyser)
    analyser.connect(musicGain)
    musicGain.connect(master)

    // Air: filtered noise whose level follows how fast the cursor moves through particles.
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const ch = buf.getChannelData(0)
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 900
    band.Q.value = 0.6
    const air = ctx.createGain()
    air.gain.value = 0
    noise.connect(band)
    band.connect(air)
    air.connect(master)
    noise.start()

    this.ctx = ctx
    this.master = master
    this.music = music
    this.musicGain = musicGain
    this.analyser = analyser
    this.data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
    this.air = air
    this.noiseBuf = buf
    this.buildForest(ctx)
    this.buildKeys(ctx)
    this.buildPond(ctx)
    this.buildRain(ctx)
    this.buildDrone(ctx)
    return ctx
  }

  async enable(track = this.track) {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') await ctx.resume()
    this.on = true
    this.play(track)
    this.master!.gain.cancelScheduledValues(ctx.currentTime)
    this.master!.gain.setTargetAtTime(1, ctx.currentTime, 0.6)
  }

  disable() {
    if (!this.ctx || !this.master) return
    this.on = false
    const ctx = this.ctx
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
    window.setTimeout(() => {
      if (!this.on) this.music?.pause()
    }, 900)
  }

  play(track: number) {
    if (!this.music || !this.ctx) return
    this.track = (track + TRACKS.length) % TRACKS.length
    const src = TRACKS[this.track].src
    // Alone, the chosen ambience comes forward; under a song only the soft keys stay, quietly.
    this.cur = TRACKS[this.track].amb || 'keys'
    this.musicOn = !!src
    for (const [id, g] of Object.entries(this.amb)) g.gain.setTargetAtTime(src ? (id === 'keys' ? 0.3 : 0) : id === this.cur ? 1 : 0, this.ctx.currentTime, 1)
    if (!src) {
      this.music.pause()
      return
    }
    if (!this.music.src.endsWith(src)) this.music.src = src
    this.music.play().catch(() => {})
  }

  // ---------- The red panda's home: wind in bamboo, culms knocking, a stream, birds ----------

  private noise(ctx: AudioContext) {
    const n = ctx.createBufferSource()
    n.buffer = this.noiseBuf
    n.loop = true
    n.start(0, Math.random() * 1.5)
    return n
  }

  private buildForest(ctx: AudioContext) {
    const forest = ctx.createGain()
    forest.gain.value = 0
    forest.connect(this.master!)
    this.amb.forest = forest

    // Wind: low rumbling air with slow gusts.
    const gust = ctx.createOscillator()
    gust.frequency.value = 0.07
    gust.start()
    const wind = this.noise(ctx)
    const wl = ctx.createBiquadFilter()
    wl.type = 'lowpass'
    wl.frequency.value = 420
    const wg = ctx.createGain()
    wg.gain.value = 0.05
    const gustAmt = ctx.createGain()
    gustAmt.gain.value = 0.03
    gust.connect(gustAmt)
    gustAmt.connect(wg.gain)
    wind.connect(wl)
    wl.connect(wg)
    wg.connect(forest)

    // Leaves: a high hiss that rises with the gusts.
    const leaves = this.noise(ctx)
    const lh = ctx.createBiquadFilter()
    lh.type = 'bandpass'
    lh.frequency.value = 5200
    lh.Q.value = 0.7
    const lg = ctx.createGain()
    lg.gain.value = 0.004
    const lgAmt = ctx.createGain()
    lgAmt.gain.value = 0.004
    gust.connect(lgAmt)
    lgAmt.connect(lg.gain)
    leaves.connect(lh)
    lh.connect(lg)
    lg.connect(forest)

    // Stream: several narrow bands of water whose pitch wanders, so it babbles.
    for (let i = 0; i < 4; i++) {
      const w = this.noise(ctx)
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 900 + i * 520
      bp.Q.value = 6
      const wob = ctx.createOscillator()
      wob.type = 'triangle'
      wob.frequency.value = 2.3 + i * 1.7
      const wobAmt = ctx.createGain()
      wobAmt.gain.value = 260 + i * 120
      wob.connect(wobAmt)
      wobAmt.connect(bp.frequency)
      wob.start()
      const g = ctx.createGain()
      g.gain.value = 0.022
      w.connect(bp)
      bp.connect(g)
      g.connect(forest)
    }

    const loop = (fn: () => void, min: number, max: number) => this.loop('forest', fn, min, max)
    // Bamboo culms knock together in the wind, in little runs.
    loop(() => {
      const n = 1 + ((Math.random() * 3) | 0)
      for (let i = 0; i < n; i++) this.knock(0.35 + Math.random() * 0.4, ctx.currentTime + i * (0.09 + Math.random() * 0.14), forest)
    }, 1800, 6500)
    // Birds: quick chirps, and now and then a cuckoo far away.
    loop(() => this.chirp(forest), 2500, 8000)
    loop(() => this.cuckoo(forest), 14000, 30000)
  }

  private active(id: string) {
    return this.on && this.cur === id && !this.musicOn
  }

  private loop(id: string, fn: () => void, min: number, max: number) {
    const run = () => {
      if (this.active(id) || (id === 'keys' && this.on && this.musicOn)) fn()
      window.setTimeout(run, min + Math.random() * (max - min))
    }
    window.setTimeout(run, min * Math.random())
  }

  // A cheap echo room: two feedback delays so single notes bloom and fade.
  private room(ctx: AudioContext, dest: AudioNode, mix = 0.35) {
    const inp = ctx.createGain()
    inp.connect(dest)
    for (const t of [0.37, 0.61]) {
      const d = ctx.createDelay(1)
      d.delayTime.value = t
      const fb = ctx.createGain()
      fb.gain.value = 0.42
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1800
      const w = ctx.createGain()
      w.gain.value = mix
      inp.connect(d)
      d.connect(lp)
      lp.connect(fb)
      fb.connect(d)
      lp.connect(w)
      w.connect(dest)
    }
    return inp
  }

  // Soft keys: a slow, generative piano-like line in a major pentatonic, with room to breathe.
  private buildKeys(ctx: AudioContext) {
    const g = ctx.createGain()
    g.gain.value = 0
    g.connect(this.master!)
    this.amb.keys = g
    const room = this.room(ctx, g)
    const notes = [0, 2, 4, 7, 9, 12, 14, 16]
    let last = 3
    this.loop('keys', () => {
      last = Math.max(0, Math.min(notes.length - 1, last + ((Math.random() * 5) | 0) - 2))
      const f = 261.63 * Math.pow(2, notes[last] / 12)
      const t = ctx.currentTime
      for (const [m, a, d] of [[1, 0.05, 2.4], [2, 0.012, 1.2], [3.01, 0.004, 0.6]]) {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = f * m
        const v = ctx.createGain()
        v.gain.setValueAtTime(0, t)
        v.gain.linearRampToValueAtTime(a, t + 0.012)
        v.gain.exponentialRampToValueAtTime(0.0001, t + d)
        o.connect(v)
        v.connect(room)
        o.start(t)
        o.stop(t + d + 0.1)
      }
      if (Math.random() < 0.25) {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = 130.81 * Math.pow(2, notes[(Math.random() * 3) | 0] / 12)
        const v = ctx.createGain()
        v.gain.setValueAtTime(0, t)
        v.gain.linearRampToValueAtTime(0.05, t + 0.05)
        v.gain.exponentialRampToValueAtTime(0.0001, t + 3.5)
        o.connect(v)
        v.connect(room)
        o.start(t)
        o.stop(t + 3.6)
      }
    }, 1300, 3200)
  }

  // Night pond: crickets that pulse, frogs that answer each other, a low warm hum. Tones only, no hiss.
  private buildPond(ctx: AudioContext) {
    const g = ctx.createGain()
    g.gain.value = 0
    g.connect(this.master!)
    this.amb.pond = g
    for (const [f, rate, amp] of [[4300, 11, 0.012], [4650, 9.3, 0.009], [3900, 13.2, 0.007]]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const v = ctx.createGain()
      v.gain.value = 0
      const lfo = ctx.createOscillator()
      lfo.frequency.value = rate
      const la = ctx.createGain()
      la.gain.value = amp
      const gate = ctx.createOscillator()
      gate.frequency.value = 0.4 + rate * 0.01
      const ga = ctx.createGain()
      ga.gain.value = amp * 0.9
      lfo.connect(la)
      la.connect(v.gain)
      gate.connect(ga)
      ga.connect(v.gain)
      o.connect(v)
      v.connect(g)
      o.start()
      lfo.start()
      gate.start()
    }
    const hum = ctx.createOscillator()
    hum.type = 'sine'
    hum.frequency.value = 87.31
    const hg = ctx.createGain()
    hg.gain.value = 0.03
    hum.connect(hg)
    hg.connect(g)
    hum.start()
    this.loop('pond', () => {
      const t = ctx.currentTime
      const base = 150 + Math.random() * 60
      const n = 2 + ((Math.random() * 2) | 0)
      for (let i = 0; i < n; i++) {
        const o = ctx.createOscillator()
        o.type = 'sine'
        const s = t + i * 0.22
        o.frequency.setValueAtTime(base, s)
        o.frequency.exponentialRampToValueAtTime(base * 1.7, s + 0.08)
        const v = ctx.createGain()
        v.gain.setValueAtTime(0, s)
        v.gain.linearRampToValueAtTime(0.05, s + 0.02)
        v.gain.exponentialRampToValueAtTime(0.0001, s + 0.16)
        o.connect(v)
        v.connect(g)
        o.start(s)
        o.stop(s + 0.2)
      }
    }, 4000, 11000)
  }

  // Rain drops: no wash of noise, only single drops landing on water, near and far.
  private buildRain(ctx: AudioContext) {
    const g = ctx.createGain()
    g.gain.value = 0
    g.connect(this.master!)
    this.amb.rain = g
    const room = this.room(ctx, g, 0.2)
    this.loop('rain', () => {
      const t = ctx.currentTime
      const f = 700 + Math.random() * 1700
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(f, t)
      o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.05)
      const v = ctx.createGain()
      const a = 0.012 + Math.random() * 0.03
      v.gain.setValueAtTime(0, t)
      v.gain.linearRampToValueAtTime(a, t + 0.004)
      v.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
      const p = ctx.createStereoPanner()
      p.pan.value = Math.random() * 2 - 1
      o.connect(v)
      v.connect(p)
      p.connect(room)
      o.start(t)
      o.stop(t + 0.15)
    }, 60, 260)
    for (const f of [110, 164.81, 220]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const v = ctx.createGain()
      v.gain.value = 0.012
      o.connect(v)
      v.connect(g)
      o.start()
    }
  }

  // Deep drone: a slow pad drifting between chords, with a sparse bell.
  private buildDrone(ctx: AudioContext) {
    const g = ctx.createGain()
    g.gain.value = 0
    g.connect(this.master!)
    this.amb.drone = g
    const chords = [[0, 7, 12, 16], [-3, 4, 9, 12], [-5, 2, 7, 11], [-7, 0, 5, 9]]
    const pad = ctx.createGain()
    pad.gain.value = 0.07
    const plp = ctx.createBiquadFilter()
    plp.type = 'lowpass'
    plp.frequency.value = 900
    pad.connect(plp)
    plp.connect(g)
    const voices = [0, 1, 2, 3, 4, 5].map((i) => {
      const o = ctx.createOscillator()
      o.type = i > 3 ? 'triangle' : 'sine'
      o.detune.value = (i - 2.5) * 4
      const v = ctx.createGain()
      v.gain.value = 0.4
      o.connect(v)
      v.connect(pad)
      o.start()
      return o
    })
    let ci = 0
    const move = () => {
      const ch = chords[ci++ % chords.length]
      voices.forEach((o, i) => o.frequency.setTargetAtTime(130.81 * Math.pow(2, (ch[i % 4] - (i > 3 ? 12 : 0)) / 12), ctx.currentTime, 3))
    }
    move()
    window.setInterval(move, 10000)
    this.loop('drone', () => this.bell(g), 3500, 9000)
  }

  private bell(dest: AudioNode) {
    const ctx = this.ctx!
    const t = ctx.currentTime
    const f = 523.25 * Math.pow(2, SCALE[(Math.random() * SCALE.length) | 0] / 12)
    for (const [m, a] of [[1, 0.03], [2.01, 0.01]]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f * m
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(a, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2)
      o.connect(g)
      g.connect(dest)
      o.start(t)
      o.stop(t + 3.3)
    }
  }

  // A hollow wooden tock: a fast-falling tone with a resonant body and a click.
  knock(vel = 0.6, at?: number, dest?: AudioNode) {
    if (!this.on || !this.ctx || !this.master) return
    const ctx = this.ctx
    const t = at ?? ctx.currentTime
    const out = dest ?? this.master
    const f = 280 + Math.random() * 360
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(f * 1.5, t)
    o.frequency.exponentialRampToValueAtTime(f, t + 0.03)
    const o2 = ctx.createOscillator()
    o2.type = 'sine'
    o2.frequency.value = f * 2.76
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.003)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
    const g2 = ctx.createGain()
    g2.gain.setValueAtTime(0.05 * vel, t)
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
    o.connect(g)
    o2.connect(g2)
    g.connect(out)
    g2.connect(out)
    o.start(t)
    o2.start(t)
    o.stop(t + 0.25)
    o2.stop(t + 0.1)
  }

  private chirp(dest: AudioNode) {
    const ctx = this.ctx!
    const n = 2 + ((Math.random() * 4) | 0)
    const base = 2600 + Math.random() * 1800
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.random() * 1.6 - 0.8
    pan.connect(dest)
    for (let i = 0; i < n; i++) {
      const t = ctx.currentTime + i * (0.1 + Math.random() * 0.06)
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), t)
      o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.4), t + 0.05)
      o.frequency.exponentialRampToValueAtTime(base * 0.85, t + 0.09)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.025, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
      o.connect(g)
      g.connect(pan)
      o.start(t)
      o.stop(t + 0.12)
    }
  }

  private cuckoo(dest: AudioNode) {
    const ctx = this.ctx!
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1400
    lp.connect(dest)
    ;[0, 0.42].forEach((d, i) => {
      const t = ctx.currentTime + d
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = i === 0 ? 760 : 620
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.02, t + 0.04)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38)
      o.connect(g)
      g.connect(lp)
      o.start(t)
      o.stop(t + 0.4)
    })
  }

  // Touching the particles: soft knocks, like brushing through a stand of bamboo.
  brush(amount: number) {
    if (!this.on || !this.ctx || amount < 0.35) return
    const now = this.ctx.currentTime
    if (now - this.lastKnock < 0.16 + (1 - amount) * 0.3) return
    this.lastKnock = now
    this.knock(0.2 + amount * 0.5)
  }

  // 0..1: low and mid energy of the music, smoothed. The particles breathe with it.
  level() {
    if (!this.on || !this.analyser || !this.data) {
      this.smooth *= 0.9
      return this.smooth
    }
    this.analyser.getByteFrequencyData(this.data)
    let sum = 0
    for (let i = 1; i < 24; i++) sum += this.data[i]
    const v = Math.min(1, sum / (23 * 255) * 1.4)
    this.smooth += (v - this.smooth) * 0.25
    return this.smooth
  }

  pluck(seed: number) {
    if (!this.on || !this.ctx || !this.master) return
    const ctx = this.ctx
    const now = ctx.currentTime
    if (now - this.lastPluck < 0.06) return
    this.lastPluck = now
    const step = SCALE[Math.abs(seed) % SCALE.length] + 12 * (Math.abs(seed >> 3) % 2)
    const freq = 392 * Math.pow(2, step / 12)
    const o = ctx.createOscillator()
    const o2 = ctx.createOscillator()
    const g = ctx.createGain()
    const lp = ctx.createBiquadFilter()
    o.type = 'sine'
    o2.type = 'triangle'
    o.frequency.value = freq
    o2.frequency.value = freq * 2
    lp.type = 'lowpass'
    lp.frequency.value = 2400
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(0.07, now + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9)
    o.connect(g)
    o2.connect(g)
    g.connect(lp)
    lp.connect(this.master)
    o.start(now)
    o2.start(now)
    o.stop(now + 1)
    o2.stop(now + 1)
  }

  // amount 0..1: how much the cursor is stirring the particles.
  stir(amount: number) {
    if (!this.ctx || !this.air) return
    const target = 0 * amount
    this.air.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12)
  }
}

export const sound = new Sound()

export function hashText(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
