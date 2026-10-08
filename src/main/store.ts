/* Stockage JSON local (bibliothèque, collections, sessions, réglages). Écriture atomique (fichier temporaire + rename), sauvegarde différée. */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_SETTINGS, type Collection, type Game, type Session, type Settings } from '../shared/types'
import { log } from './log'

const L = log('store')

interface LibraryFile {
  version: 1
  games: Game[]
  collections: Collection[]
}

function readJson<T>(file: string, fallback: T): T {
  if (!existsSync(file)) return fallback
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch (e) {
    // fichier abîmé : on le met de côté au lieu de l'écraser, et on repart de zéro
    L.error('fichier illisible, mis de côté :', file, e)
    renameSync(file, file + '.bad-' + Date.now())
    return fallback
  }
}

function writeJson(file: string, data: unknown): void {
  const tmp = file + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 1))
  renameSync(tmp, file)
}

/* Chiffrement facultatif des secrets (safeStorage d'Electron = DPAPI sous Windows) */
export interface Crypt {
  enc: (s: string) => string
  dec: (s: string) => string
}

export class Store {
  games = new Map<string, Game>()
  collections: Collection[] = []
  sessions: Session[] = []
  settings: Settings = structuredClone(DEFAULT_SETTINGS)
  private timer: NodeJS.Timeout | null = null

  constructor(private dir: string, private crypt?: Crypt) {
    mkdirSync(dir, { recursive: true })
    const lib = readJson<LibraryFile>(join(dir, 'library.json'), { version: 1, games: [], collections: [] })
    for (const g of lib.games) this.games.set(g.id, g)
    this.collections = lib.collections
    this.sessions = readJson<Session[]>(join(dir, 'sessions.json'), [])
    const { steamGridDbKeyEnc, ...s } = readJson<Partial<Settings> & { steamGridDbKeyEnc?: string }>(join(dir, 'settings.json'), {})
    this.settings = { ...this.settings, ...s, scanners: { ...this.settings.scanners, ...s.scanners } }
    if (steamGridDbKeyEnc && crypt) {
      try { this.settings.steamGridDbKey = crypt.dec(steamGridDbKeyEnc) } catch { L.warn('clé SteamGridDB illisible (autre session Windows ?), à ressaisir') }
    }
  }

  list(): Game[] {
    return [...this.games.values()]
  }

  /* Sauvegarde groupée : plusieurs modifications rapprochées = une seule écriture */
  save(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), 300)
  }

  flush(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    writeJson(join(this.dir, 'library.json'), { version: 1, games: this.list(), collections: this.collections } satisfies LibraryFile)
    writeJson(join(this.dir, 'sessions.json'), this.sessions)
    const { steamGridDbKey, ...rest } = this.settings
    writeJson(join(this.dir, 'settings.json'), this.crypt && steamGridDbKey ? { ...rest, steamGridDbKey: '', steamGridDbKeyEnc: this.crypt.enc(steamGridDbKey) } : this.settings)
  }
}
