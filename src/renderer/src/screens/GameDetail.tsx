/* Fiche d'un jeu : fond « hero », logo, temps de jeu, dernière session, Jouer, favori, collections, modifier, jaquettes */
import { useState } from 'react'
import { api } from '../api'
import { Confirm, Menu } from '../components/Modal'
import { Cover } from '../components/Cover'
import { CoverPicker } from '../components/CoverPicker'
import { EditGame } from '../components/EditGame'
import { Keyboard } from '../components/Keyboard'
import { useT } from '../i18n/i18n'
import { HintBar } from '../nav/glyphs'
import { useNav } from '../nav/nav'
import { useLibrary } from '../state/library'
import { useRouter } from '../state/router'
import { useSession } from '../state/session'
import { useSettings } from '../state/settings'
import { ago, playtime, PLATFORM_LABEL } from '../state/format'

export function GameDetail({ id }: { id: string }) {
  const t = useT()
  const { byId, collections, reloadCollections } = useLibrary()
  const { back } = useRouter()
  const { settings } = useSettings()
  const { launch, running } = useSession()
  const [modal, setModal] = useState<null | 'more' | 'edit' | 'media' | 'coll' | 'newColl' | 'remove'>(null)
  const g = byId.get(id)
  useNav((a) => {
    if (modal || !g) return false
    if (a === 'y') { api['library:update'](g.id, { favorite: !g.favorite }); return true }
    if (a === 'x') { setModal('more'); return true }
    return false
  })
  if (!g) return <main className="screen"><p className="muted">{t('game.missing')}</p></main>
  const lang = settings.language
  const isRunning = running?.gameId === g.id
  const toggleColl = (cid: string) => api['library:update'](g.id, { collections: g.collections.includes(cid) ? g.collections.filter((c) => c !== cid) : [...g.collections, cid] })

  return (
    <main className="screen detail">
      <div className="detail__bg"><Cover game={g} kind="hero" /></div>
      <div className="detail__body">
        <p className="kicker">{PLATFORM_LABEL[g.platform]}{g.installed ? '' : ' · ' + t('game.notInstalled')}</p>
        {g.media.logo ? <img className="detail__logo" src={g.media.logo} alt={g.name} /> : <h1 className="hero-title detail__name">{g.name}</h1>}
        <dl className="stats">
          <div><dt className="mono">{t('game.playtime')}</dt><dd>{playtime(g.playtime, lang)}</dd></div>
          <div><dt className="mono">{t('game.last')}</dt><dd>{ago(g.lastPlayed, lang)}</dd></div>
          {g.info?.releaseDate && <div><dt className="mono">{t('game.release')}</dt><dd>{g.info.releaseDate}</dd></div>}
          {g.info?.developer && <div><dt className="mono">{t('game.dev')}</dt><dd>{g.info.developer}</dd></div>}
        </dl>
        <div className="actions">
          <button className="btn btn--primary btn--play" data-nav data-nav-autofocus disabled={!g.installed || !!running} onClick={() => launch(g)}>
            ▶ {isRunning ? t('game.running') : t('game.play')}
          </button>
          <button className="btn" data-nav onClick={() => api['library:update'](g.id, { favorite: !g.favorite })}>{g.favorite ? '★ ' + t('game.unfav') : '☆ ' + t('game.fav')}</button>
          <button className="btn" data-nav onClick={() => setModal('coll')}>{t('game.collections')}</button>
          <button className="btn" data-nav onClick={() => setModal('more')}>{t('game.more')}</button>
        </div>
        {g.info?.genres && <p className="mono muted genres">{g.info.genres.join(' · ')}</p>}
        {g.info?.description && <p className="detail__desc">{g.info.description}</p>}
      </div>
      <div className="detail__cover card"><Cover game={g} /></div>
      <HintBar items={[['accept', 'hint.select'], ['y', g.favorite ? 'game.unfav' : 'game.fav'], ['x', 'game.more'], ['back', 'hint.back']]} />

      {modal === 'more' && (
        <Menu title={g.name} onClose={() => setModal(null)} items={[
          { label: t('game.edit'), onSelect: () => setModal('edit') },
          { label: t('game.media'), onSelect: () => setModal('media') },
          { label: t('game.refreshMedia'), onSelect: () => { api['media:refresh'](g.id); setModal(null) } },
          { label: g.platform === 'manual' ? t('game.remove') : t('game.hide'), danger: true, onSelect: () => setModal('remove') }
        ]} />
      )}
      {modal === 'coll' && (
        <Menu title={t('game.collections')} kicker={g.name} onClose={() => setModal(null)} items={[
          ...collections.map((c) => ({ label: c.name, checked: g.collections.includes(c.id), onSelect: () => toggleColl(c.id) })),
          { label: '＋ ' + t('coll.new'), onSelect: () => setModal('newColl') }
        ]} />
      )}
      {modal === 'newColl' && (
        <Keyboard title={t('coll.new')} value="" max={60} onCancel={() => setModal('coll')} onSubmit={async (v) => {
          if (v.trim()) { const c = await api['collections:create'](v); await reloadCollections(); await api['library:update'](g.id, { collections: [...g.collections, c.id] }) }
          setModal('coll')
        }} />
      )}
      {modal === 'edit' && <EditGame game={g} onClose={() => setModal(null)} />}
      {modal === 'media' && <CoverPicker game={g} onClose={() => setModal(null)} />}
      {modal === 'remove' && (
        <Confirm title={g.platform === 'manual' ? t('game.removeQ') : t('game.hideQ')} text={g.platform === 'manual' ? t('game.removeText') : t('game.hideText')}
          ok={g.platform === 'manual' ? t('game.remove') : t('game.hide')} cancel={t('common.cancel')} danger
          onClose={() => setModal(null)} onOk={async () => { await api['library:remove'](g.id); setModal(null); back() }} />
      )}
    </main>
  )
}
