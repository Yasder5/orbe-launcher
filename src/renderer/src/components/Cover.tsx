/* Jaquette d'un jeu ; sans image, une jaquette générée au style du thème (nom + plateforme). */
import { useState } from 'react'
import type { Game } from '@shared/types'
import { PLATFORM_LABEL } from '../state/format'

export function Cover({ game, kind = 'cover' }: { game: Game; kind?: 'cover' | 'hero' }) {
  const [broken, setBroken] = useState<string>()
  const src = game.media[kind]
  if (src && src !== broken) return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBroken(src)} />
  return (
    <div className={'placeholder placeholder--' + kind}>
      <span className="placeholder__p">{PLATFORM_LABEL[game.platform]}</span>
      <span className="placeholder__n">{game.name}</span>
    </div>
  )
}
