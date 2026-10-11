/* Choix d'une autre jaquette / fond / logo / icône parmi les résultats SteamGridDB (ou Steam), ou depuis un fichier */
import { useEffect, useState } from 'react'
import type { MediaKind, MediaOption } from '@shared/ipc'
import type { Game } from '@shared/types'
import { api } from '../api'
import { useT } from '../i18n/i18n'
import { useNav } from '../nav/nav'
import { useSettings } from '../state/settings'
import { FileBrowser } from './FileBrowser'
import { Modal } from './Modal'

const KINDS: MediaKind[] = ['cover', 'hero', 'logo', 'icon']

export function CoverPicker({ game, onClose }: { game: Game; onClose: () => void }) {
  const t = useT()
  const { settings } = useSettings()
  const [kind, setKind] = useState<MediaKind>('cover')
  const [opts, setOpts] = useState<MediaOption[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [file, setFile] = useState(false)
  useEffect(() => { setOpts(null); api['media:options'](game.id, kind).then(setOpts).catch((e) => { setOpts([]); setErr(String(e.message ?? e)) }) }, [game.id, kind])
  useNav((a) => {
    const i = KINDS.indexOf(kind)
    if (a === 'lb') { setKind(KINDS[(i + 3) % 4]); return true }
    if (a === 'rb') { setKind(KINDS[(i + 1) % 4]); return true }
    return false
  }, !file, 2)
  const pick = async (url: string) => {
    setBusy(true)
    try { await api['media:set'](game.id, kind, url); onClose() } catch { setErr(t('media.failed')); setBusy(false) }
  }
  if (file) return <FileBrowser filter="image" title={t('media.fromFile')} onClose={() => setFile(false)} onPick={async (p) => { await api['media:setFile'](game.id, kind, p); onClose() }} />
  return (
    <Modal title={t('media.title')} kicker={game.name} onClose={onClose} wide>
      <div className="seg">
        {KINDS.map((k) => <button key={k} className={'seg__b' + (k === kind ? ' is-active' : '')} onClick={() => setKind(k)}>{t('media.' + k)}</button>)}
      </div>
      {!settings.steamGridDbKey && <p className="muted small">{t('media.noKey')}</p>}
      {err && <p className="error">{err}</p>}
      <div className={'picker picker--' + kind}>
        <button className="picker__opt picker__file" data-nav onClick={() => setFile(true)}>{t('media.fromFile')}</button>
        {opts === null && <p className="muted">{t('media.loading')}</p>}
        {opts?.map((o, i) => (
          <button key={o.url + i} className="picker__opt" data-nav disabled={busy} {...(i === 0 ? { 'data-nav-autofocus': true } : {})} onClick={() => pick(o.url)}>
            <img src={o.thumb} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </Modal>
  )
}
