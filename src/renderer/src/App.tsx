import { useState } from 'react'
import { Background } from './components/Background'
import { Keyboard } from './components/Keyboard'
import { HintBar } from './nav/glyphs'
import { NavProvider } from './nav/nav'
import { SettingsProvider } from './state/settings'
import { ThemeProvider } from './theme/theme'
import './styles/base.css'

function Preview() {
  const [kb, setKb] = useState(false)
  const [text, setText] = useState('')
  return (
    <main style={{ padding: 'var(--pad)' }}>
      <Background paused={false} />
      <p className="kicker">Navigation</p>
      <h1 className="hero-title">Orbe <mark>Launcher</mark></h1>
      <p className="muted">{text || '…'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 140px)', gap: 18, marginTop: 32 }}>
        {Array.from({ length: 12 }, (_, i) => <button key={i} className="card" data-nav style={{ height: 210 }} />)}
      </div>
      <button className="btn btn--primary" data-nav style={{ marginTop: 32 }} onClick={() => setKb(true)}>Clavier</button>
      {kb && <Keyboard value={text} onSubmit={(v) => { setText(v); setKb(false) }} onCancel={() => setKb(false)} />}
      {!kb && <HintBar items={[['accept', 'hint.select'], ['back', 'hint.back']]} />}
    </main>
  )
}

export function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <NavProvider>
          <Preview />
        </NavProvider>
      </ThemeProvider>
    </SettingsProvider>
  )
}
