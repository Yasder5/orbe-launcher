/* Contrat IPC : une seule source de vérité pour le preload (window.orbe) et les handlers du processus principal. */
import type { AppInfo, Collection, Game, Settings } from './types'
import type { ThemeManifest } from './theme'

export interface ThemeEntry {
  manifest: ThemeManifest
  base: string // URL de base des fichiers du thème (orbe-theme://<id>/)
  builtin: boolean
  warnings: string[]
}

export interface Api {
  'app:info': () => Promise<AppInfo>
  'library:list': () => Promise<Game[]>
  'library:update': (id: string, patch: Partial<Pick<Game, 'name' | 'favorite' | 'hidden' | 'exe' | 'args' | 'workDir' | 'collections'>>) => Promise<Game>
  'collections:list': () => Promise<Collection[]>
  'collections:create': (name: string) => Promise<Collection>
  'collections:rename': (id: string, name: string) => Promise<void>
  'collections:delete': (id: string) => Promise<void>
  'settings:get': () => Promise<Settings>
  'settings:set': (patch: Partial<Settings>) => Promise<Settings>
  'themes:list': () => Promise<ThemeEntry[]>
}

/* Événements poussés par le processus principal vers l'interface */
export interface Events {
  'library:changed': Game[]
  'settings:changed': Settings
  'themes:changed': { id: string; themes: ThemeEntry[] }
}

export type Channel = keyof Api
export type EventName = keyof Events

export const CHANNELS = [
  'app:info',
  'library:list',
  'library:update',
  'collections:list',
  'collections:create',
  'collections:rename',
  'collections:delete',
  'settings:get',
  'settings:set',
  'themes:list'
] as const satisfies readonly Channel[]

export const EVENTS = ['library:changed', 'settings:changed', 'themes:changed'] as const satisfies readonly EventName[]

/* Ce que l'interface voit dans window.orbe */
export type OrbeApi = Api & {
  on: <E extends EventName>(event: E, cb: (payload: Events[E]) => void) => () => void
}
