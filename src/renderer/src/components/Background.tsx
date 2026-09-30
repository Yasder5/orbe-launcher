/* Fond défini par le thème : orbe, image, vidéo ou rien. La vidéo est mise en pause pendant un jeu. */
import { useEffect, useRef } from 'react'
import { useTheme } from '../theme/theme'
import { Orb } from './Orb'

export function Background({ paused }: { paused: boolean }) {
  const { theme, url } = useTheme()
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => { if (video.current) paused ? video.current.pause() : video.current.play().catch(() => {}) }, [paused])
  const bg = theme?.manifest.background
  if (!bg || bg.type === 'none') return null
  return (
    <div className="bg-layer" aria-hidden>
      {bg.type === 'orb' && <Orb />}
      {bg.type === 'image' && <img src={url(bg.src)} alt="" />}
      {bg.type === 'video' && <video ref={video} src={url(bg.src)} autoPlay muted loop playsInline />}
    </div>
  )
}
