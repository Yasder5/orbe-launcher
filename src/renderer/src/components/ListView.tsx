/* Disposition « liste » (proposée par un thème) : une ligne par jeu, jaquette à droite de la ligne focalisée */
import type { Game } from '@shared/types'
import { useT } from '../i18n/i18n'
import { useSettings } from '../state/settings'
import { ago, playtime, PLATFORM_LABEL } from '../state/format'

export function ListView({ games, onOpen }: { games: Game[]; onOpen: (g: Game) => void }) {
  const t = useT()
  const { settings } = useSettings()
  return (
    <div className="list">
      {games.map((g, i) => (
        <button key={g.id} className="row-item" data-nav data-nav-id={'g:' + g.id} data-nav-scroll="center" {...(i === 0 ? { 'data-nav-autofocus': true } : {})} onClick={() => onOpen(g)}>
          <span className="row-item__name">{g.favorite ? '★ ' : ''}{g.name}</span>
          <span className="row-item__meta mono">{PLATFORM_LABEL[g.platform]}</span>
          <span className="row-item__meta mono">{playtime(g.playtime, settings.language)}</span>
          <span className="row-item__meta mono">{g.lastPlayed ? ago(g.lastPlayed, settings.language) : t('time.never')}</span>
        </button>
      ))}
    </div>
  )
}
