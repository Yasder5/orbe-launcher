/* Menu système (bouton Menu / Start) : jeu en cours, quitter, veille, redémarrer, éteindre — toujours avec confirmation */
import { useState } from 'react'
import type { PowerAction } from '@shared/ipc'
import { api } from '../api'
import { useT } from '../i18n/i18n'
import { useLibrary } from '../state/library'
import { useSession } from '../state/session'
import { Confirm, Menu } from './Modal'

type Ask = { title: string; ok: string; run: () => void } | null

export function SystemMenu({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { running, stop } = useSession()
  const { byId } = useLibrary()
  const [ask, setAsk] = useState<Ask>(null)
  const pw = (a: PowerAction, title: string, ok: string) => setAsk({ title, ok, run: () => api['system:power'](a) })
  if (ask) return <Confirm title={ask.title} ok={ask.ok} cancel={t('common.cancel')} danger onClose={() => setAsk(null)} onOk={() => { ask.run(); setAsk(null); onClose() }} />
  const g = running && byId.get(running.gameId)
  return (
    <Menu title={t('sys.title')} kicker="Orbe Launcher" onClose={onClose} items={[
      ...(g ? [{ label: t('sys.stopTracking', { name: g.name }), hint: t('sys.stopHint'), onSelect: () => { stop(); onClose() } }] : []),
      { label: t('sys.quit'), onSelect: () => setAsk({ title: t('sys.quitQ'), ok: t('sys.quit'), run: () => api['system:quit']() }) },
      { label: t('sys.sleep'), onSelect: () => pw('sleep', t('sys.sleepQ'), t('sys.sleep')) },
      { label: t('sys.restart'), onSelect: () => pw('restart', t('sys.restartQ'), t('sys.restart')) },
      { label: t('sys.shutdown'), danger: true, onSelect: () => pw('shutdown', t('sys.shutdownQ'), t('sys.shutdown')) }
    ]} />
  )
}
