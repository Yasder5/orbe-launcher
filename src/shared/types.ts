/* Types partagés entre le processus principal et l'interface */

export type Platform = 'steam' | 'epic' | 'gog' | 'ubisoft' | 'ea' | 'manual'
export type ScannerId = Exclude<Platform, 'manual'>
export const SCANNERS: ScannerId[] = ['steam', 'epic', 'gog', 'ubisoft', 'ea']

export interface GameMedia {
  cover?: string // URL servie par orbe-media:// (cache) ou fichier choisi par l'utilisateur
  hero?: string
  logo?: string
  icon?: string
}

export interface GameInfo {
  description?: string
  genres?: string[]
  releaseDate?: string
  developer?: string
}

export interface Game {
  id: string // `${platform}:${platformId}`
  platform: Platform
  platformId: string
  name: string
  installDir?: string
  exe?: string // exécutable direct (GOG, manuel) ; sert aussi au suivi du processus
  args?: string
  workDir?: string
  launchUri?: string // steam://, com.epicgames.launcher://, uplay://…
  installed: boolean
  favorite: boolean
  hidden: boolean
  addedAt: number
  lastPlayed?: number
  playtime: number // secondes
  collections: string[]
  media: GameMedia
  info?: GameInfo
  steamAppId?: string // utile pour les médias même hors Steam
  nameLocked?: boolean // nom modifié par l'utilisateur : le scan ne l'écrase plus
  argsLocked?: boolean // arguments / dossier de travail modifiés à la main
  sgdbId?: number // identifiant SteamGridDB (mis en cache)
  steamSearched?: boolean // appid Steam déjà cherché pour un jeu hors Steam
  mediaCheckedAt?: number
}

export interface Session {
  gameId: string
  start: number
  end: number
}

export interface Collection {
  id: string
  name: string
  createdAt: number
}

export type Language = 'fr' | 'en'

export interface Settings {
  theme: string
  steamGridDbKey: string
  scanners: Record<ScannerId, boolean>
  extraFolders: string[] // dossiers supplémentaires où chercher des exe (ajout rapide)
  autostart: boolean
  fullscreen: boolean
  kiosk: boolean
  volume: number // 0…1
  vibration: boolean
  language: Language
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'orbe',
  steamGridDbKey: '',
  scanners: { steam: true, epic: true, gog: true, ubisoft: true, ea: true },
  extraFolders: [],
  autostart: false,
  fullscreen: true,
  kiosk: false,
  volume: 0.6,
  vibration: true,
  language: 'fr'
}

export interface AppInfo {
  version: string
  platform: string
  dataDir: string
  dev: boolean
}
