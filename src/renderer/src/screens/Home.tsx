/* Accueil : dernier jeu en grand, puis derniers lancés, favoris, ajoutés récemment */
import type { Game } from '@shared/types'
import { Cover } from '../components/Cover'
import { Row } from '../components/Row'
import { useT } from '../i18n/i18n'
import { HintBar } from '../nav/glyphs'
import { useLibrary } from '../state/library'
import { useRouter } from '../state/router'
import { useSettings } from '../state/settings'
import { ago, playtime } from '../state/format'

export function Home() {
  const t = useT()
  const { games, scanning } = useLibrary()
  const { go } = useRouter()
  const { settings } = useSettings()
  const open = (g: Game) => go({ name: 'game', id: g.id })
  const recent = games.filter((g) => g.lastPlayed).sort((a, b) => b.lastPlayed! - a.lastPlayed!).slice(0, 12)
  const favs = games.filter((g) => g.favorite).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 20)
  const added = [...games].sort((a, b) => b.addedAt - a.addedAt).slice(0, 12)
  const hero = recent[0] ?? favs[0] ?? added[0]

  if (!games.length)
    return (
      <main className="screen screen--empty">
        <p className="kicker">{t('home.kicker')}</p>
        <h1 className="hero-title">{scanning ? t('home.scanning') : t('home.empty')}</h1>
        <p className="muted">{t('home.emptyText')}</p>
      </main>
    )

  return (
    <main className="screen home">
      {hero && (
        <section className="home__hero">
          <div className="home__heroBg"><Cover game={hero} kind="hero" /></div>
          <div className="home__heroTxt">
            <p className="kicker">{recent[0] ? t('home.continue') : t('home.pick')}</p>
            {hero.media.logo ? <img className="home__logo" src={hero.media.logo} alt={hero.name} /> : <h1 className="hero-title">{hero.name}</h1>}
            <p className="mono muted">{playtime(hero.playtime, settings.language)} · {ago(hero.lastPlayed, settings.language)}</p>
            <button className="btn btn--primary" data-nav data-nav-autofocus data-nav-id="home:hero" onClick={() => open(hero)}>{t('home.open')}</button>
          </div>
        </section>
      )}
      <Row title={t('home.recent')} games={recent} onOpen={open} />
      <Row title={t('home.favorites')} games={favs} onOpen={open} />
      <Row title={t('home.added')} games={added} onOpen={open} />
      <HintBar items={[['accept', 'hint.select'], ['menu', 'hint.system']]} />
    </main>
  )
}
