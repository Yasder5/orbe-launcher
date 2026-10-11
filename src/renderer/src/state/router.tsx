/* Navigation entre écrans : pile de routes, onglets à la racine, focus restauré au retour. */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type Tab = 'home' | 'library' | 'collections' | 'settings'
export type Route = { name: Tab } | { name: 'collection'; id: string } | { name: 'game'; id: string }
interface Entry { route: Route; focus?: string } // focus = data-nav-id à retrouver au retour

interface Ctx {
  route: Route
  focusOnShow?: string
  tab: Tab
  go: (r: Route) => void // empile
  back: () => boolean // false si déjà à la racine
  setTab: (t: Tab) => void
}

const RouterCtx = createContext<Ctx>(null!)
export const TABS: Tab[] = ['home', 'library', 'collections', 'settings']

const currentNavId = () => (document.querySelector('.is-focused') as HTMLElement | null)?.dataset.navId

export function RouterProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Entry[]>([{ route: { name: 'home' } }])
  const [focusOnShow, setFocusOnShow] = useState<string>()
  const go = useCallback((r: Route) => {
    const f = currentNavId()
    setFocusOnShow(undefined)
    setStack((s) => [...s.slice(0, -1), { ...s[s.length - 1], focus: f }, { route: r }])
  }, [])
  const back = useCallback(() => {
    if (stack.length < 2) return false
    setFocusOnShow(stack[stack.length - 2].focus)
    setStack((s) => s.slice(0, -1))
    return true
  }, [stack])
  const setTab = useCallback((t: Tab) => { setFocusOnShow(undefined); setStack([{ route: { name: t } }]) }, [])
  const route = stack[stack.length - 1].route
  const tab = (TABS.includes(stack[0].route.name as Tab) ? stack[0].route.name : 'home') as Tab
  return <RouterCtx.Provider value={{ route, tab, go, back, setTab, focusOnShow }}>{children}</RouterCtx.Provider>
}

export const useRouter = () => useContext(RouterCtx)
