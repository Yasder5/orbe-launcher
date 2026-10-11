import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { Background } from './components/Background'
import { Modal } from './components/Modal'
import { Splash } from './components/Splash'
import { SystemMenu } from './components/SystemMenu'
import { TopBar } from './components/TopBar'
import { useT } from './i18n/i18n'
import { modalOpen, NavProvider, useNav, useNavCtx } from './nav/nav'
import { play } from './nav/sounds'
import { Collections } from './screens/Collections'
import { GameDetail } from './screens/GameDetail'
import { Home } from './screens/Home'
import { Library } from './screens/Library'
import { Settings } from './screens/Settings'
import { LibraryProvider, useLibrary } from './state/library'
import { RouterProvider, TABS, useRouter } from './state/router'
import { SessionProvider, useSession } from './state/session'
import { SettingsProvider } from './state/settings'
import { ThemeProvider } from './theme/theme'
import './styles/base.css'

function Shell() {
  const t = useT()
  const { route, tab, setTab, back, focusOnShow } = useRouter()
  const { running, error, clearError } = useSession()
  const { byId } = useLibrary()
  const { focus } = useNavCtx()
  const [system, setSystem] = useState(false)
  const [splash, setSplash] = useState(true)

  // actions globales : onglets (LB/RB), retour, menu système
  useNav((a) => {
    if (modalOpen()) return false
    if (a === 'lb' || a === 'rb') { play('move'); setTab(TABS[(TABS.indexOf(tab) + (a === 'rb' ? 1 : TABS.length - 1)) % TABS.length]); return true }
    if (a === 'back') { if (back()) play('back'); return true }
    if (a === 'menu') { play('select'); setSystem(true); return true }
    return false
  }, true, 0)
  const endSplash = useCallback(() => setSplash(false), [])
  // retour sur un écran : focus remis sur l'élément quitté
  useEffect(() => {
    if (!focusOnShow) return
    const id = requestAnimationFrame(() => focus(document.querySelector(`[data-nav-id="${CSS.escape(focusOnShow)}"]`)))
    return () => cancelAnimationFrame(id)
  }, [route, focusOnShow, focus])
  useEffect(() => api.on('app:front', () => setSystem(false)), [])
  useEffect(() => { document.documentElement.dataset.route = route.name }, [route])

  const g = running && byId.get(running.gameId)
  return (
    <>
      <Background paused={!!running} />
      <TopBar />
      <div className="view" key={JSON.stringify(route)}>
        {route.name === 'home' && <Home />}
        {route.name === 'library' && <Library />}
        {route.name === 'collections' && <Collections />}
        {route.name === 'collection' && <Library collectionId={route.id} />}
        {route.name === 'settings' && <Settings />}
        {route.name === 'game' && <GameDetail id={route.id} />}
      </div>
      {g && <div className="playing mono">▶ {t('game.playing', { name: g.name })}{!running.tracked && ' · ' + t('game.waiting')}</div>}
      {system && <SystemMenu onClose={() => setSystem(false)} />}
      {error && (
        <Modal title={t('game.launchError')} onClose={clearError}>
          <p className="muted">{error}</p>
          <div className="actions"><button className="btn btn--primary" data-nav data-nav-autofocus onClick={clearError}>OK</button></div>
        </Modal>
      )}
      {splash && <Splash onDone={endSplash} />}
    </>
  )
}

export function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <NavProvider>
          <LibraryProvider>
            <SessionProvider>
              <RouterProvider>
                <Shell />
              </RouterProvider>
            </SessionProvider>
          </LibraryProvider>
        </NavProvider>
      </ThemeProvider>
    </SettingsProvider>
  )
}
