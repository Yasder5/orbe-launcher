/* Explorateur de fichiers navigable à la manette (choix d'un exe, d'une image, d'un dossier) */
import { useEffect, useState } from 'react'
import type { FsFilter, FsListing } from '@shared/ipc'
import { api } from '../api'
import { useT } from '../i18n/i18n'
import { useNav } from '../nav/nav'
import { Modal } from './Modal'

export function FileBrowser({ filter, start = '', title, onPick, onClose }: { filter: FsFilter; start?: string; title: string; onPick: (path: string) => void; onClose: () => void }) {
  const t = useT()
  const [list, setList] = useState<FsListing | null>(null)
  const [err, setErr] = useState('')
  const open = (dir: string) => api['fs:list'](dir, filter).then((l) => { setList(l); setErr('') }).catch(() => setErr(t('fs.denied')))
  useEffect(() => { open(start) }, [])
  // X = remonter d'un dossier
  useNav((a) => { if (a === 'x' && list?.parent !== null && list) { open(list.parent ?? ''); return true } return false }, true, 2)
  return (
    <Modal title={title} kicker={list?.dir || t('fs.drives')} onClose={onClose} wide>
      {err && <p className="error">{err}</p>}
      <div className="files">
        {list?.parent !== null && list && (
          <button className="file file--up" data-nav onClick={() => open(list.parent ?? '')}>↰ {t('fs.up')}</button>
        )}
        {filter === 'dir' && list?.dir && (
          <button className="file file--pick" data-nav onClick={() => onPick(list.dir)}>✓ {t('fs.pickDir')}</button>
        )}
        {list?.entries.map((e, i) => (
          <button key={e.path} className={'file' + (e.dir ? ' file--dir' : '')} data-nav {...(i === 0 ? { 'data-nav-autofocus': true } : {})} onClick={() => (e.dir ? open(e.path) : onPick(e.path))}>
            {e.dir ? '▸ ' : ''}{e.name}
          </button>
        ))}
        {list && !list.entries.length && <p className="muted">{t('fs.empty')}</p>}
      </div>
    </Modal>
  )
}
