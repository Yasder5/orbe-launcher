/* Collections créées par l'utilisateur */
import { useState } from 'react'
import { api } from '../api'
import { Cover } from '../components/Cover'
import { Keyboard } from '../components/Keyboard'
import { useT } from '../i18n/i18n'
import { HintBar } from '../nav/glyphs'
import { useLibrary } from '../state/library'
import { useRouter } from '../state/router'

export function Collections() {
  const t = useT()
  const { collections, games, reloadCollections } = useLibrary()
  const { go } = useRouter()
  const [creating, setCreating] = useState(false)
  return (
    <main className="screen collections">
      <p className="kicker">{t('coll.kicker')}</p>
      <h1 className="title">{t('tab.collections')}</h1>
      <div className="colls">
        <button className="coll coll--new" data-nav data-nav-autofocus onClick={() => setCreating(true)}>＋ {t('coll.new')}</button>
        {collections.map((c) => {
          const inside = games.filter((g) => g.collections.includes(c.id))
          return (
            <button key={c.id} className="coll" data-nav data-nav-id={'c:' + c.id} onClick={() => go({ name: 'collection', id: c.id })}>
              <div className="coll__covers">{inside.slice(0, 3).map((g) => <Cover key={g.id} game={g} />)}</div>
              <span className="coll__name">{c.name}</span>
              <span className="mono muted">{t('coll.count', { n: inside.length })}</span>
            </button>
          )
        })}
      </div>
      {!collections.length && <p className="muted">{t('coll.none')}</p>}
      <HintBar items={[['accept', 'hint.select']]} />
      {creating && (
        <Keyboard title={t('coll.new')} value="" max={60} onCancel={() => setCreating(false)} onSubmit={async (v) => { if (v.trim()) { await api['collections:create'](v); await reloadCollections() } setCreating(false) }} />
      )}
    </main>
  )
}
