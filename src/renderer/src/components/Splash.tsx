/* Écran de démarrage défini par le thème (orbe, logo, image, vidéo), puis fondu */
import { useEffect, useState } from 'react'
import { useTheme } from '../theme/theme'
import { Orb } from './Orb'

export function Splash({ onDone }: { onDone: () => void }) {
  const { theme, url } = useTheme()
  const [out, setOut] = useState(false)
  const s = theme?.manifest.splash
  useEffect(() => {
    if (!theme) return
    const d = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : (s?.duration ?? 0)
    const a = setTimeout(() => setOut(true), d), b = setTimeout(onDone, d + 450)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [theme])
  if (!theme || !s || s.type === 'none') return null
  return (
    <div className={'splash' + (out ? ' is-out' : '')} aria-hidden>
      {s.type === 'orb' && <Orb x={0.5} y={0.5} radius={0.3} />}
      {s.type === 'image' && <img src={url(s.src)} alt="" />}
      {s.type === 'video' && <video src={url(s.src)} autoPlay muted playsInline />}
      <div className="splash__logo">orbe<span>.</span></div>
    </div>
  )
}
