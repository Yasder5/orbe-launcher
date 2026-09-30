/* Application du thème actif : variables CSS sur :root, polices, feuille theme.css. Changement et rechargement à chaud. */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ThemeEntry } from '@shared/ipc'
import { api } from '../api'
import { useSettings } from '../state/settings'

interface Ctx {
  theme: ThemeEntry | null
  themes: ThemeEntry[]
  url: (rel?: string) => string | undefined // chemin du thème -> URL
}

const ThemeCtx = createContext<Ctx>({ theme: null, themes: [], url: () => undefined })
let applied: string[] = []

function apply(t: ThemeEntry, version: number): void {
  const root = document.documentElement, m = t.manifest
  for (const k of applied) root.style.removeProperty(k)
  for (const [k, v] of Object.entries(m.vars)) root.style.setProperty(k, v)
  applied = Object.keys(m.vars)
  root.dataset.theme = m.id
  root.dataset.layout = m.layout.library

  const fonts = el('style', 'theme-fonts') as HTMLStyleElement
  fonts.textContent = m.fonts
    .map((f) => `@font-face{font-family:"${f.family}";src:url("${t.base + f.src}");font-weight:${f.weight ?? '400'};font-style:${f.style ?? 'normal'};font-display:swap;${f.unicodeRange ? `unicode-range:${f.unicodeRange};` : ''}}`)
    .join('\n')
  const link = el('link', 'theme-css') as HTMLLinkElement
  link.rel = 'stylesheet'
  if (m.css) link.href = `${t.base}${m.css}?v=${version}` // ?v= force le rechargement après modification
  else link.removeAttribute('href')
}

function el(tag: string, id: string): HTMLElement {
  let n = document.getElementById(id)
  if (!n) { n = document.createElement(tag); n.id = id; document.head.append(n) }
  return n
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, ready } = useSettings()
  const [themes, setThemes] = useState<ThemeEntry[]>([])
  const [version, setVersion] = useState(Date.now())
  useEffect(() => {
    api['themes:list']().then(setThemes)
    return api.on('themes:changed', ({ themes }) => { setThemes(themes); setVersion(Date.now()) })
  }, [])
  const theme = themes.find((t) => t.manifest.id === settings.theme) ?? themes.find((t) => t.manifest.id === 'orbe') ?? themes[0] ?? null
  useEffect(() => { if (theme && ready) apply(theme, version) }, [theme, version, ready])
  const url = (rel?: string) => (rel && theme ? theme.base + rel : undefined)
  return <ThemeCtx.Provider value={{ theme, themes, url }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
