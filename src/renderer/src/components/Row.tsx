/* Rangée horizontale de cartes (accueil, disposition carrousel) */
import type { Game } from '@shared/types'
import { GameCard } from './GameCard'

export function Row({ title, games, onOpen, autofocusFirst }: { title: string; games: Game[]; onOpen: (g: Game) => void; autofocusFirst?: boolean }) {
  if (!games.length) return null
  return (
    <section className="row">
      <h2 className="row__title kicker">{title}</h2>
      <div className="row__track">
        {games.map((g, i) => <GameCard key={g.id} game={g} onOpen={onOpen} autofocus={autofocusFirst && i === 0} />)}
      </div>
    </section>
  )
}
