/* Orbe de particules (sphère de Fibonacci en rotation), reprise du site. S'arrête quand l'appli est en pause. */
import { useEffect, useRef } from 'react'

interface Props {
  count?: number
  radius?: number // part de la plus petite dimension
  x?: number // centre, 0…1
  y?: number
  className?: string
}

export function Orb({ count = 520, radius = 0.36, x = 0.72, y = 0.5, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!, ctx = cv.getContext('2d')!
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#d3fd50'
    const text = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#f5f5f0'
    const pts: [number, number, number, boolean][] = []
    for (let i = 0; i < count; i++) {
      const yy = 1 - (i / (count - 1)) * 2, r = Math.sqrt(1 - yy * yy), th = i * 2.39996323
      pts.push([Math.cos(th) * r, yy, Math.sin(th) * r, i % 9 === 0])
    }
    let raf = 0, W = 0, H = 0
    const size = () => { W = cv.width = cv.clientWidth * devicePixelRatio; H = cv.height = cv.clientHeight * devicePixelRatio }
    size()
    addEventListener('resize', size)
    const t0 = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (document.documentElement.dataset.paused !== undefined) return // jeu lancé : on ne dessine plus rien
      const t = (now - t0) / 1000, a = t * 0.12, b = Math.sin(t * 0.17) * 0.3
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), R = Math.min(W, H) * radius
      ctx.clearRect(0, 0, W, H)
      for (const [px, py, pz, hot] of pts) {
        const x1 = px * ca - pz * sa, z1 = px * sa + pz * ca, y1 = py * cb - z1 * sb, z2 = py * sb + z1 * cb, d = (z2 + 1.4) / 2.4
        ctx.globalAlpha = hot ? 0.2 + d * 0.7 : 0.06 + d * 0.42
        ctx.fillStyle = hot ? accent : text
        ctx.beginPath()
        ctx.arc(W * x + x1 * R, H * y + y1 * R, (hot ? 2.4 : 1.5) * devicePixelRatio * (0.6 + d * 0.7), 0, 6.283)
        ctx.fill()
      }
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size) }
  }, [count, radius, x, y])
  return <canvas ref={ref} className={className} />
}
