/* Interface commune des scanners : chacun est isolé, peut échouer sans gêner les autres. */
import type { Game, ScannerId } from '../../shared/types'

export type ScannedGame = Pick<Game, 'platform' | 'platformId' | 'name'> & Partial<Pick<Game, 'installDir' | 'exe' | 'args' | 'workDir' | 'launchUri' | 'steamAppId' | 'installed'>>

export interface ScanEnv {
  programData: string // C:\ProgramData
  reg: (key: string) => Promise<Map<string, Record<string, string>>> // lecture du registre (récursive)
  exists: (p: string) => boolean
  readText: (p: string) => string
  list: (dir: string) => string[] // noms de fichiers d'un dossier ([] s'il n'existe pas)
}

export interface Scanner {
  id: ScannerId
  name: string
  scan: (env: ScanEnv) => Promise<ScannedGame[]>
}
