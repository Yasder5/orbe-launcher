/* Maquette de l'API pour l'aperçu dans un navigateur (développement de l'interface, captures). Données fictives. */
import type { Events, EventName, OrbeApi, ThemeEntry } from '@shared/ipc'
import { validateTheme } from '@shared/theme'
import { DEFAULT_SETTINGS, type Collection, type Game, type Settings } from '@shared/types'

const listeners = new Map<string, Set<(p: never) => void>>()
const fire = <E extends EventName>(e: E, p: Events[E]) => listeners.get(e)?.forEach((cb) => (cb as (x: Events[E]) => void)(p))

let settings: Settings = { ...DEFAULT_SETTINGS }
const collections: Collection[] = []
const games: Game[] = []

async function themes(): Promise<ThemeEntry[]> {
  const out: ThemeEntry[] = []
  for (const id of ['orbe']) {
    const base = `./themes/${id}/`
    try {
      const c = validateTheme(await (await fetch(base + 'theme.json')).json(), id)
      if (c.theme) out.push({ manifest: c.theme, base, builtin: true, warnings: c.warnings })
    } catch {
      /* thème absent de l'aperçu */
    }
  }
  return out
}

export const mock: OrbeApi = {
  'app:info': async () => ({ version: 'aperçu', platform: 'web', dataDir: '-', dev: true }),
  'library:list': async () => games,
  'library:update': async (id, patch) => {
    const g = games.find((x) => x.id === id)!
    Object.assign(g, patch)
    fire('library:changed', games)
    return g
  },
  'collections:list': async () => collections,
  'collections:create': async (name) => {
    const c = { id: String(Date.now()), name, createdAt: Date.now() }
    collections.push(c)
    return c
  },
  'collections:rename': async (id, name) => {
    const c = collections.find((x) => x.id === id)
    if (c) c.name = name
  },
  'collections:delete': async (id) => {
    collections.splice(collections.findIndex((c) => c.id === id), 1)
  },
  'settings:get': async () => settings,
  'settings:set': async (patch) => {
    settings = { ...settings, ...patch }
    fire('settings:changed', settings)
    return settings
  },
  'themes:list': themes,
  on: (event, cb) => {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(cb as (p: never) => void)
    return () => listeners.get(event)!.delete(cb as (p: never) => void)
  }
}
