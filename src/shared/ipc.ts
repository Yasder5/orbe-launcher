/* Contrat IPC : une seule source de vérité pour le preload (window.orbe) et les handlers du processus principal. */
import type { AppInfo, Collection, Game, ScannerId, Settings } from './types'
import type { ThemeManifest } from './theme'

export interface ScanReport {
  added: number
  updated: number
  uninstalled: number
  merged: number
  failed: ScannerId[]
  total: number
}

export interface ManualGameInput {
  name: string
  exe: string
  args?: string
  workDir?: string
}

export interface FsEntry { name: string; path: string; dir: boolean }
export interface FsListing { dir: string; parent: string | null; entries: FsEntry[] }
export type FsFilter = 'exe' | 'image' | 'dir'

export interface RunningGame { gameId: string; start: number; tracked: boolean }
export type PowerAction = 'sleep' | 'restart' | 'shutdown'

export type MediaKind = 'cover' | 'hero' | 'logo' | 'icon'
export interface MediaOption { url: string; thumb: string; width?: number; height?: number }

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
  'library:rescan': () => Promise<ScanReport>
  'library:addManual': (input: ManualGameInput) => Promise<Game>
  'library:remove': (id: string) => Promise<void>
  'fs:list': (dir: string, filter: FsFilter) => Promise<FsListing>
  'media:options': (gameId: string, kind: MediaKind) => Promise<MediaOption[]>
  'media:set': (gameId: string, kind: MediaKind, url: string) => Promise<Game>
  'media:setFile': (gameId: string, kind: MediaKind, path: string) => Promise<Game>
  'media:refresh': (gameId: string) => Promise<void>
  'game:launch': (id: string) => Promise<void>
  'game:stop': () => Promise<void>
  'session:get': () => Promise<RunningGame | null>
  'system:power': (action: PowerAction) => Promise<void>
  'system:quit': () => Promise<void>
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
  'scan:state': { running: boolean; report?: ScanReport }
  'session:state': { running: RunningGame | null; last?: { gameId: string; duration: number } }
  'app:front': true
  'settings:changed': Settings
  'themes:changed': { id: string; themes: ThemeEntry[] }
}

export type Channel = keyof Api
export type EventName = keyof Events

export const CHANNELS = [
  'app:info',
  'library:list',
  'library:update',
  'library:rescan',
  'library:addManual',
  'library:remove',
  'fs:list',
  'media:options',
  'media:set',
  'media:setFile',
  'media:refresh',
  'game:launch',
  'game:stop',
  'session:get',
  'system:power',
  'system:quit',
  'collections:list',
  'collections:create',
  'collections:rename',
  'collections:delete',
  'settings:get',
  'settings:set',
  'themes:list'
] as const satisfies readonly Channel[]

export const EVENTS = ['library:changed', 'scan:state', 'session:state', 'app:front', 'settings:changed', 'themes:changed'] as const satisfies readonly EventName[]

/* Ce que l'interface voit dans window.orbe */
export type OrbeApi = Api & {
  on: <E extends EventName>(event: E, cb: (payload: Events[E]) => void) => () => void
}
