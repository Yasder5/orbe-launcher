import { Background } from './components/Background'
import { SettingsProvider, useSettings } from './state/settings'
import { ThemeProvider, useTheme } from './theme/theme'
import './styles/base.css'

function Preview() {
  const { themes, theme } = useTheme()
  const { update } = useSettings()
  return (
    <main style={{ padding: 'var(--pad)' }}>
      <Background paused={false} />
      <p className="kicker">Thèmes</p>
      <h1 className="hero-title">Orbe <mark>Launcher</mark></h1>
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        {themes.map((t) => (
          <button key={t.manifest.id} className={'btn' + (t === theme ? ' btn--primary' : '')} onClick={() => update({ theme: t.manifest.id })}>{t.manifest.name}</button>
        ))}
      </div>
    </main>
  )
}

export function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <Preview />
      </ThemeProvider>
    </SettingsProvider>
  )
}
