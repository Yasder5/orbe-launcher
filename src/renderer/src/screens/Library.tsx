/* Bibliothèque (ou une collection) : filtres, tri, recherche instantanée, disposition choisie par le thème */
import { useMemo, useState } from 'react'
import type { Game } from '@shared/types'
import { EditGame } from '../components/EditGame'
import { FileBrowser } from '../components/FileBrowser'
import { Grid } from '../components/Grid'
import { Keyboard } from '../components/Keyboard'
import { ListView } from '../components/ListView'
import { Menu } from '../components/Modal'
import { GameCard } from '../components/GameCard'
import { useT } from '../i18n/i18n'
import { HintBar } from '../nav/glyphs'
import { useNav } from '../nav/nav'
import { api } from '../api'
import { useLibrary } from '../state/library'
import { useRouter } from '../state/router'
import { PLATFORM_LABEL } from '../state/format'
import { useTheme } from '../theme/theme'
import { filterGames, SORTS, type Filter, type Sort } from './filter'

export function Library({ collectionId }: { collectionId?: string }) {
  const t = useT()
  const { games, collections, rescan, scanning, reloadCollections } = useLibrary()
  const { go, back, focusOnShow } = useRouter()
  const { theme } = useTheme()
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('name')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<null | 'search' | 'add' | 'addForm' | 'collection' | 'rename'>(null)
  const [exe, setExe] = useState('')
  const coll = collections.find((c) => c.id === collectionId)

  const base = collectionId ? games.filter((g) => g.collections.includes(collectionId)) : games
  const platforms = useMemo(() => [...new Set(base.map((g) => g.platform))].sort(), [base])
  const list = useMemo(() => filterGames(base, { filter, sort, query }), [base, filter, sort, query])
  const open = (g: Game) => go({ name: 'game', id: g.id })

  useNav((a) => {
    if (modal) return false
    if (a === 'x') { setModal('search'); return true }
    if (a === 'y') { setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length]); return true }
    if (a === 'view' && collectionId) { setModal('collection'); return true }
    return false
  })

  const filters: Filter[] = ['all', 'installed', 'favorites', ...platforms]
  const layout = theme?.manifest.layout.library ?? 'grid'
  return (
    <main className="screen library">
      <header className="library__head">
        <div>
          <p className="kicker">{coll ? t('lib.collection') : t('lib.kicker')}</p>
          <h1 className="title">{coll?.name ?? t('tab.library')} <span className="muted count">{list.length}</span></h1>
        </div>
        <div className="toolbar">
          {query && <button className="chip chip--on" data-nav onClick={() => setQuery('')}>« {query} » ✕</button>}
          <button className="btn" data-nav onClick={() => setModal('search')}>⌕ {t('lib.search')}</button>
          <button className="btn" data-nav onClick={() => setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length])}>{t('sort.' + sort)}</button>
          {!collectionId && <button className="btn" data-nav onClick={() => setModal('add')}>＋ {t('lib.add')}</button>}
          {!collectionId && <button className="btn" data-nav disabled={scanning} onClick={rescan}>{scanning ? t('scan.running') : t('lib.rescan')}</button>}
          {collectionId && <button className="btn" data-nav onClick={() => setModal('collection')}>{t('coll.options')}</button>}
        </div>
      </header>
      <div className="chips">
        {filters.map((f) => (
          <button key={f} className={'chip' + (f === filter ? ' chip--on' : '')} data-nav onClick={() => setFilter(f)}>
            {f === 'all' || f === 'installed' || f === 'favorites' ? t('filter.' + f) : PLATFORM_LABEL[f]}
          </button>
        ))}
      </div>
      {!list.length && <p className="muted empty">{query ? t('lib.noResult', { q: query }) : collectionId ? t('coll.empty') : t('lib.empty')}</p>}
      {layout === 'grid' && <Grid games={list} onOpen={open} initialId={focusOnShow} />}
      {layout === 'list' && <ListView games={list} onOpen={open} />}
      {layout === 'carousel' && (
        <div className="carousel">{list.map((g, i) => <GameCard key={g.id} game={g} onOpen={open} autofocus={i === 0} />)}</div>
      )}
      <HintBar items={[['accept', 'hint.select'], ['x', 'lib.search'], ['y', 'hint.sort'], ['back', 'hint.back']]} />

      {modal === 'search' && <Keyboard title={t('lib.search')} value={query} onChange={setQuery} onSubmit={(v) => { setQuery(v); setModal(null) }} onCancel={() => setModal(null)} />}
      {modal === 'add' && <FileBrowser filter="exe" title={t('lib.pickExe')} onClose={() => setModal(null)} onPick={(p) => { setExe(p); setModal('addForm') }} />}
      {modal === 'addForm' && <EditGame initialExe={exe} onClose={() => setModal(null)} onSaved={open} />}
      {modal === 'rename' && coll && (
        <Keyboard title={t('coll.rename')} value={coll.name} max={60} onCancel={() => setModal(null)} onSubmit={async (v) => { await api['collections:rename'](coll.id, v); await reloadCollections(); setModal(null) }} />
      )}
      {modal === 'collection' && coll && (
        <Menu title={coll.name} kicker={t('lib.collection')} onClose={() => setModal(null)} items={[
          { label: t('coll.rename'), onSelect: () => setModal('rename') },
          { label: t('coll.delete'), danger: true, onSelect: async () => { await api['collections:delete'](coll.id); await reloadCollections(); setModal(null); back() } }
        ]} />
      )}
    </main>
  )
}
