/* Maquette de l'API pour l'aperçu dans un navigateur (développement de l'interface, captures). Données fictives. */
import type { Events, EventName, OrbeApi, ThemeEntry } from '@shared/ipc'
import { validateTheme } from '@shared/theme'
import { DEFAULT_SETTINGS, type Collection, type Game, type Settings } from '@shared/types'

const listeners = new Map<string, Set<(p: never) => void>>()
const fire = <E extends EventName>(e: E, p: Events[E]) => listeners.get(e)?.forEach((cb) => (cb as (x: Events[E]) => void)(p))

let settings: Settings = { ...DEFAULT_SETTINGS }
const collections: Collection[] = []
const SAMPLE: [string, string, string][] = [
  ['367520', 'Hollow Knight', 'steam'], ['1245620', 'ELDEN RING', 'steam'], ['1145360', 'Hades', 'steam'], ['504230', 'Celeste', 'steam'],
  ['413150', 'Stardew Valley', 'steam'], ['1091500', 'Cyberpunk 2077', 'gog'], ['292030', 'The Witcher 3: Wild Hunt', 'gog'], ['620', 'Portal 2', 'steam'],
  ['753640', 'Outer Wilds', 'epic'], ['632470', 'Disco Elysium', 'steam'], ['374320', 'DARK SOULS III', 'steam'], ['1086940', "Baldur's Gate 3", 'steam'],
  ['814380', 'Sekiro: Shadows Die Twice', 'steam'], ['1092790', 'Inscryption', 'epic'], ['1687950', 'Persona 5 Royal', 'steam'], ['2552430', 'KINGDOM HEARTS -HD 1.5+2.5 ReMIX-', 'epic']
]
const day = 864e5
const games: Game[] = SAMPLE.map(([appid, name, platform], i) => ({
  id: `${platform}:${appid}`, platform: platform as Game['platform'], platformId: appid, name, steamAppId: appid, installed: i !== 13, favorite: i % 5 === 0, hidden: false,
  addedAt: Date.now() - i * 3 * day, lastPlayed: i < 6 ? Date.now() - i * day : undefined, playtime: (16 - i) * 3600 * 2.3, collections: [], media: {}
}))

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
  'library:rescan': async () => ({ added: 0, updated: games.length, uninstalled: 0, merged: 0, failed: [], total: games.length }),
  'library:addManual': async (input) => {
    const g: Game = { id: 'manual:' + Date.now(), platform: 'manual', platformId: String(Date.now()), ...input, installed: true, favorite: false, hidden: false, addedAt: Date.now(), playtime: 0, collections: [], media: {} }
    games.push(g)
    fire('library:changed', games)
    return g
  },
  'library:remove': async (id) => { games.splice(games.findIndex((g) => g.id === id), 1); fire('library:changed', games) },
  'fs:list': async (dir) => ({ dir, parent: dir ? '' : null, entries: dir ? [{ name: 'Jeu.exe', path: dir + '\\Jeu.exe', dir: false }] : [{ name: 'C:\\', path: 'C:\\', dir: true }] }),
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
