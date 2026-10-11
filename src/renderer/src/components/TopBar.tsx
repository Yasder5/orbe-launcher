/* En-tête : onglets (LB / RB pour changer), heure, indicateur de scan */
import { useEffect, useState } from 'react'
import { Glyph } from '../nav/glyphs'
import { useT } from '../i18n/i18n'
import { useLibrary } from '../state/library'
import { TABS, useRouter } from '../state/router'
import { useSettings } from '../state/settings'

export function TopBar() {
  const t = useT()
  const { tab, setTab } = useRouter()
  const { scanning } = useLibrary()
  const { settings } = useSettings()
  const [now, setNow] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(i) }, [])
  return (
    <header className="topbar">
      <span className="topbar__logo">orbe<span>.</span></span>
      <nav className="tabs">
        <Glyph action="lb" />
        {TABS.map((k) => (
          <button key={k} className={'tab' + (k === tab ? ' is-active' : '')} onClick={() => setTab(k)}>{t('tab.' + k)}</button>
        ))}
        <Glyph action="rb" />
      </nav>
      <span className="topbar__end mono">
        {scanning && <span className="muted">{t('scan.running')}</span>}
        {now.toLocaleTimeString(settings.language === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </header>
  )
}
