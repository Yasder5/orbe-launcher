/* Modifier un jeu (nom, exe, arguments, dossier de travail) ou en ajouter un à la main. Chaque champ s'édite au clavier virtuel ou à l'explorateur. */
import { useState } from 'react'
import type { Game } from '@shared/types'
import { api } from '../api'
import { useT } from '../i18n/i18n'
import { FileBrowser } from './FileBrowser'
import { Keyboard } from './Keyboard'
import { Modal } from './Modal'

type Field = 'name' | 'exe' | 'args' | 'workDir'
interface Values { name: string; exe: string; args: string; workDir: string }

export function EditGame({ game, initialExe, onClose, onSaved }: { game?: Game; initialExe?: string; onClose: () => void; onSaved?: (g: Game) => void }) {
  const t = useT()
  const guess = (exe: string) => exe.split(/[\\/]/).pop()?.replace(/\.\w+$/, '') ?? ''
  const [v, setV] = useState<Values>({ name: game?.name ?? guess(initialExe ?? ''), exe: game?.exe ?? initialExe ?? '', args: game?.args ?? '', workDir: game?.workDir ?? '' })
  const [edit, setEdit] = useState<Field | null>(null)
  const [err, setErr] = useState('')
  const canExe = !game || game.platform === 'manual' || game.platform === 'gog' || game.platform === 'ea'

  const save = async () => {
    try {
      const g = game
        ? await api['library:update'](game.id, { name: v.name, args: v.args, workDir: v.workDir, ...(canExe ? { exe: v.exe } : {}) })
        : await api['library:addManual']({ name: v.name, exe: v.exe, args: v.args || undefined, workDir: v.workDir || undefined })
      onSaved?.(g)
      onClose()
    } catch (e) {
      setErr(String((e as Error).message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
    }
  }

  if (edit === 'exe' || edit === 'workDir')
    return <FileBrowser filter={edit === 'exe' ? 'exe' : 'dir'} title={t('edit.' + edit)} onClose={() => setEdit(null)} onPick={(p) => { setV({ ...v, [edit]: p, ...(edit === 'exe' && !v.name ? { name: guess(p) } : {}) }); setEdit(null) }} />
  if (edit) return <Keyboard title={t('edit.' + edit)} value={v[edit]} onCancel={() => setEdit(null)} onSubmit={(s) => { setV({ ...v, [edit]: s }); setEdit(null) }} />

  const fields: Field[] = canExe ? ['name', 'exe', 'args', 'workDir'] : ['name', 'args']
  return (
    <Modal title={game ? t('edit.title') : t('edit.addTitle')} kicker={game?.name} onClose={onClose} wide>
      <div className="form">
        {fields.map((f, i) => (
          <button key={f} className="field" data-nav {...(i === 0 ? { 'data-nav-autofocus': true } : {})} onClick={() => setEdit(f)}>
            <span className="field__l mono">{t('edit.' + f)}</span>
            <span className={'field__v' + (v[f] ? '' : ' muted')}>{v[f] || t('edit.empty')}</span>
          </button>
        ))}
      </div>
      {err && <p className="error">{err}</p>}
      <div className="actions">
        <button className="btn" data-nav onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn--primary" data-nav disabled={!v.exe && !game} onClick={save}>{t('common.save')}</button>
      </div>
    </Modal>
  )
}
