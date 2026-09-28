/* Validation des données reçues de l'interface (frontière de confiance de l'IPC). */
import { SCANNERS, type Game, type Settings } from '../shared/types'

export class InvalidInput extends Error {}

export function str(v: unknown, max = 500, name = 'valeur'): string {
  if (typeof v !== 'string' || v.length > max) throw new InvalidInput(`${name} : texte de ${max} caractères max attendu`)
  return v
}

const bool = (v: unknown, name: string): boolean => {
  if (typeof v !== 'boolean') throw new InvalidInput(`${name} : booléen attendu`)
  return v
}

/* Ne garde que les champs connus, chacun vérifié ; tout le reste est ignoré */
export function settingsPatch(p: unknown): Partial<Settings> {
  if (!p || typeof p !== 'object') throw new InvalidInput('réglages invalides')
  const i = p as Record<string, unknown>, o: Partial<Settings> = {}
  if ('theme' in i) o.theme = str(i.theme, 64, 'theme')
  if ('steamGridDbKey' in i) o.steamGridDbKey = str(i.steamGridDbKey, 128, 'clé SteamGridDB').trim()
  if ('autostart' in i) o.autostart = bool(i.autostart, 'autostart')
  if ('fullscreen' in i) o.fullscreen = bool(i.fullscreen, 'fullscreen')
  if ('kiosk' in i) o.kiosk = bool(i.kiosk, 'kiosk')
  if ('vibration' in i) o.vibration = bool(i.vibration, 'vibration')
  if ('volume' in i) {
    if (typeof i.volume !== 'number' || !(i.volume >= 0 && i.volume <= 1)) throw new InvalidInput('volume entre 0 et 1')
    o.volume = i.volume
  }
  if ('language' in i) {
    if (i.language !== 'fr' && i.language !== 'en') throw new InvalidInput('langue inconnue')
    o.language = i.language
  }
  if ('scanners' in i) {
    const s = i.scanners as Record<string, unknown>
    if (!s || typeof s !== 'object') throw new InvalidInput('scanners invalides')
    o.scanners = Object.fromEntries(SCANNERS.map((k) => [k, bool(s[k], 'scanner ' + k)])) as Settings['scanners']
  }
  if ('extraFolders' in i) {
    if (!Array.isArray(i.extraFolders) || i.extraFolders.length > 20) throw new InvalidInput('dossiers : 20 max')
    o.extraFolders = i.extraFolders.map((f) => str(f, 260, 'dossier'))
  }
  return o
}

type GamePatch = Partial<Pick<Game, 'name' | 'favorite' | 'hidden' | 'exe' | 'args' | 'workDir' | 'collections'>>

export function gamePatch(p: unknown): GamePatch {
  if (!p || typeof p !== 'object') throw new InvalidInput('modification invalide')
  const i = p as Record<string, unknown>, o: GamePatch = {}
  if ('name' in i) o.name = str(i.name, 200, 'nom').trim() || 'Sans nom'
  if ('favorite' in i) o.favorite = bool(i.favorite, 'favori')
  if ('hidden' in i) o.hidden = bool(i.hidden, 'masqué')
  if ('exe' in i) o.exe = str(i.exe, 260, 'exécutable')
  if ('args' in i) o.args = str(i.args, 1000, 'arguments')
  if ('workDir' in i) o.workDir = str(i.workDir, 260, 'dossier de travail')
  if ('collections' in i) {
    if (!Array.isArray(i.collections) || i.collections.length > 100) throw new InvalidInput('collections invalides')
    o.collections = i.collections.map((c) => str(c, 64, 'collection'))
  }
  return o
}
