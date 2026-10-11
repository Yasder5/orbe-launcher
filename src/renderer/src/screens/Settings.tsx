/* Paramètres : chaque ligne est focalisable ; gauche / droite change les valeurs à choix, A valide */
import { useEffect, useState, type ReactNode } from 'react'
import type { AppInfo } from '@shared/types'
import { SCANNERS, type ScannerId } from '@shared/types'
import { api } from '../api'
import { FileBrowser } from '../components/FileBrowser'
import { Keyboard } from '../components/Keyboard'
import { Confirm } from '../components/Modal'
import { useT } from '../i18n/i18n'
import { HintBar } from '../nav/glyphs'
import { useNav, useNavCtx } from '../nav/nav'
import { useLibrary } from '../state/library'
import { useSettings } from '../state/settings'
import { useTheme } from '../theme/theme'
import { PLATFORM_LABEL } from '../state/format'

function Line({ label, value, onSelect, onLeft, onRight, id, hint }: { label: string; value?: ReactNode; onSelect?: () => void; onLeft?: () => void; onRight?: () => void; id: string; hint?: string }) {
  return (
    <button className="setting" data-nav data-nav-id={'s:' + id} data-nav-scroll="center" data-left={onLeft ? '1' : undefined}
      onClick={onSelect ?? onRight}
      ref={(el) => { if (el) Object.assign(el, { __left: onLeft, __right: onRight }) }}>
      <span className="setting__l">{label}{hint && <small className="muted">{hint}</small>}</span>
      <span className="setting__v mono">{onLeft && '‹ '}{value}{onRight && ' ›'}</span>
    </button>
  )
}

export function Settings() {
  const t = useT()
  const { settings, update } = useSettings()
  const { themes, theme } = useTheme()
  const { rescan, scanning, lastScan } = useLibrary()
  const { current } = useNavCtx()
  const [info, setInfo] = useState<AppInfo>()
  const [modal, setModal] = useState<null | 'key' | 'folder' | 'kiosk'>(null)
  useEffect(() => { api['app:info']().then(setInfo) }, [])

  // gauche / droite sur une ligne à choix : change la valeur au lieu de déplacer le focus
  useNav((a) => {
    if (modal || (a !== 'left' && a !== 'right')) return false
    const el = current() as (HTMLElement & { __left?: () => void; __right?: () => void }) | null
    const fn = a === 'left' ? el?.__left : el?.__right
    if (!fn) return false
    fn()
    return true
  })

  const cycle = <T,>(list: T[], cur: T, d: number) => list[(list.indexOf(cur) + d + list.length) % list.length]
  const themeIds = themes.map((x) => x.manifest.id)
  const setTheme = (d: number) => update({ theme: cycle(themeIds, theme?.manifest.id ?? 'orbe', d) })
  const vol = (d: number) => update({ volume: Math.round(Math.min(1, Math.max(0, settings.volume + d * 0.1)) * 10) / 10 })
  const onOff = (b: boolean) => (b ? t('common.on') : t('common.off'))
  const toggleScanner = (id: ScannerId) => update({ scanners: { ...settings.scanners, [id]: !settings.scanners[id] } })

  return (
    <main className="screen settings">
      <p className="kicker">{t('set.kicker')}</p>
      <h1 className="title">{t('tab.settings')}</h1>
      <div className="settings__cols">
        <section>
          <h2 className="settings__h mono">{t('set.display')}</h2>
          <Line id="theme" label={t('set.theme')} value={theme?.manifest.name} onLeft={() => setTheme(-1)} onRight={() => setTheme(1)} />
          <Line id="lang" label={t('set.language')} value={settings.language === 'fr' ? 'Français' : 'English'} onLeft={() => update({ language: settings.language === 'fr' ? 'en' : 'fr' })} onRight={() => update({ language: settings.language === 'fr' ? 'en' : 'fr' })} />
          <Line id="fs" label={t('set.fullscreen')} value={onOff(settings.fullscreen)} onSelect={() => update({ fullscreen: !settings.fullscreen })} />
          <Line id="vol" label={t('set.volume')} value={<span className="bar"><span style={{ width: settings.volume * 100 + '%' }} /></span>} onLeft={() => vol(-1)} onRight={() => vol(1)} />
          <Line id="vib" label={t('set.vibration')} value={onOff(settings.vibration)} onSelect={() => update({ vibration: !settings.vibration })} />
          <h2 className="settings__h mono">{t('set.system')}</h2>
          <Line id="auto" label={t('set.autostart')} value={onOff(settings.autostart)} onSelect={() => update({ autostart: !settings.autostart })} />
          <Line id="kiosk" label={t('set.kiosk')} hint={t('set.kioskHint')} value={onOff(settings.kiosk)} onSelect={() => (settings.kiosk ? update({ kiosk: false }) : setModal('kiosk'))} />
        </section>
        <section>
          <h2 className="settings__h mono">{t('set.library')}</h2>
          <Line id="key" label={t('set.sgdb')} hint={t('set.sgdbHint')} value={settings.steamGridDbKey || t('set.none')} onSelect={() => setModal('key')} />
          {SCANNERS.map((id) => <Line key={id} id={'sc-' + id} label={id === 'folder' ? t('set.folders') : PLATFORM_LABEL[id]} value={onOff(settings.scanners[id])} onSelect={() => toggleScanner(id)} />)}
          {settings.extraFolders.map((f) => <Line key={f} id={'f-' + f} label={f} value={t('set.removeFolder')} onSelect={() => update({ extraFolders: settings.extraFolders.filter((x) => x !== f) })} />)}
          <Line id="addf" label={'＋ ' + t('set.addFolder')} onSelect={() => setModal('folder')} />
          <Line id="scan" label={t('lib.rescan')} value={scanning ? t('scan.running') : lastScan ? t('scan.report', { total: lastScan.total, added: lastScan.added }) : ''} onSelect={rescan} />
          <h2 className="settings__h mono">{t('set.about')}</h2>
          <p className="mono muted small">Orbe Launcher {info?.version} · {info?.dataDir}</p>
        </section>
      </div>
      <HintBar items={[['accept', 'hint.select'], ['left', 'hint.change'], ['back', 'hint.back']]} />

      {modal === 'key' && <Keyboard title={t('set.sgdb')} value="" max={128} onCancel={() => setModal(null)} onSubmit={(v) => { update({ steamGridDbKey: v.trim() }); setModal(null) }} />}
      {modal === 'folder' && <FileBrowser filter="dir" title={t('set.addFolder')} onClose={() => setModal(null)} onPick={(p) => { if (!settings.extraFolders.includes(p)) update({ extraFolders: [...settings.extraFolders, p] }); setModal(null) }} />}
      {modal === 'kiosk' && <Confirm title={t('set.kiosk')} text={t('set.kioskWarn')} ok={t('common.enable')} cancel={t('common.cancel')} onClose={() => setModal(null)} onOk={() => { update({ kiosk: true }); setModal(null) }} />}
    </main>
  )
}
