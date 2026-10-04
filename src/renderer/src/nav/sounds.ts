/* Sons de navigation du thème (Web Audio : latence faible, plusieurs sons superposables). */
import type { SoundName, ThemeManifest } from '@shared/theme'

let ctx: AudioContext | null = null
const buffers = new Map<SoundName, AudioBuffer>()
let volume = 0.6, token = 0

export async function loadSounds(base: string, sounds: ThemeManifest['sounds']): Promise<void> {
  const my = ++token
  buffers.clear()
  ctx ??= new AudioContext()
  await Promise.all(
    Object.entries(sounds).map(async ([name, rel]) => {
      try {
        const data = await (await fetch(base + rel)).arrayBuffer()
        const buf = await ctx!.decodeAudioData(data)
        if (my === token) buffers.set(name as SoundName, buf) // un autre thème a pu être choisi entre-temps
      } catch {
        /* son manquant ou illisible : silence */
      }
    })
  )
}

export function setVolume(v: number): void {
  volume = v
}

export function play(name: SoundName): void {
  const buf = buffers.get(name)
  if (!ctx || !buf || volume <= 0) return
  if (ctx.state === 'suspended') ctx.resume()
  const src = ctx.createBufferSource(), gain = ctx.createGain()
  gain.gain.value = volume
  src.buffer = buf
  src.connect(gain).connect(ctx.destination)
  src.start()
}
