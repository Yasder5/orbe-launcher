/* Carte de jeu focalisable */
import { memo } from 'react'
import type { Game } from '@shared/types'
import { Cover } from './Cover'

interface Props {
  game: Game
  onOpen: (g: Game) => void
  autofocus?: boolean
}

export const GameCard = memo(function GameCard({ game, onOpen, autofocus }: Props) {
  return (
    <button
      className={'card' + (game.installed ? '' : ' card--off')}
      data-nav
      data-nav-id={'g:' + game.id}
      {...(autofocus ? { 'data-nav-autofocus': true } : {})}
      onClick={() => onOpen(game)}
      aria-label={game.name}
    >
      <Cover game={game} />
      {game.favorite && <span className="card__fav" aria-hidden>★</span>}
      <span className="card__name">{game.name}</span>
    </button>
  )
})
