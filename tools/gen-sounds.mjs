// Génère les sons de navigation du thème Orbe (WAV 16 bits mono, 44,1 kHz) : sobres, courts, sans dépendance.
// Usage : node tools/gen-sounds.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const RATE = 44100
const out = join(import.meta.dirname, '..', 'themes', 'orbe', 'sounds')

/* voix : fréquence qui glisse de f0 à f1, enveloppe attaque/déclin, timbre sinus + un peu d'harmonique */
function tone(dur, f0, f1, { gain = 0.5, attack = 0.004, harm = 0.15, delay = 0 } = {}) {
  const n = Math.round((dur + delay) * RATE), s = new Float32Array(n)
  let phase = 0
  for (let i = Math.round(delay * RATE); i < n; i++) {
    const t = i / RATE - delay, p = t / dur
    const f = f0 * Math.pow(f1 / f0, p)
    phase += (2 * Math.PI * f) / RATE
    const env = Math.min(1, t / attack) * Math.pow(1 - p, 2.2)
    s[i] = gain * env * (Math.sin(phase) + harm * Math.sin(2 * phase))
  }
  return s
}

const mix = (...parts) => {
  const n = Math.max(...parts.map((p) => p.length)), s = new Float32Array(n)
  for (const p of parts) for (let i = 0; i < p.length; i++) s[i] += p[i]
  return s
}

function wav(samples) {
  const b = Buffer.alloc(44 + samples.length * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVE', 8)
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22)
  b.writeUInt32LE(RATE, 24); b.writeUInt32LE(RATE * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40)
  samples.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2))
  return b
}

const sounds = {
  move: tone(0.035, 2400, 2200, { gain: 0.18, harm: 0 }), // petit tic
  select: mix(tone(0.07, 660, 680, { gain: 0.32 }), tone(0.09, 990, 1000, { gain: 0.28, delay: 0.045 })), // deux notes qui montent
  back: mix(tone(0.07, 740, 720, { gain: 0.28 }), tone(0.09, 494, 480, { gain: 0.26, delay: 0.045 })), // deux notes qui descendent
  error: mix(tone(0.08, 180, 170, { gain: 0.35, harm: 0.4 }), tone(0.08, 180, 170, { gain: 0.35, harm: 0.4, delay: 0.11 })),
  launch: mix(tone(0.45, 330, 1320, { gain: 0.3, attack: 0.02 }), tone(0.5, 495, 1980, { gain: 0.12, attack: 0.05, delay: 0.06 }))
}

mkdirSync(out, { recursive: true })
for (const [name, s] of Object.entries(sounds)) writeFileSync(join(out, name + '.wav'), wav(s))
console.log('sons écrits dans', out)
