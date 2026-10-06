/* Fusion d'un scan avec la bibliothèque existante. Pur : testé sans Windows.
   - jeu nouveau : ajouté (addedAt = maintenant)
   - jeu connu : chemins / lancement mis à jour, données de l'utilisateur gardées (favori, temps, collections, nom modifié)
   - jeu d'un scanner terminé mais plus trouvé : marqué désinstallé (jamais supprimé : on garde temps de jeu et collections)
   - scanner en échec ou désactivé : ses jeux ne bougent pas
   - doublons : même id, ou même dossier d'installation qu'un jeu d'une plateforme (le jeu ajouté à la main est fusionné dedans) */
import type { Game, ScannerId } from '../../shared/types'
import type { ScanResult } from './index'
import type { ScannedGame } from './types'

export const gameId = (g: Pick<Game, 'platform' | 'platformId'>) => `${g.platform}:${g.platformId}`
const norm = (p?: string) => p?.toLowerCase().replace(/[\\/]+$/, '').replace(/\//g, '\\')

export interface MergeStats { added: number; updated: number; uninstalled: number; merged: number }

export function mergeScan(existing: Game[], result: Pick<ScanResult, 'ok'>, now = Date.now()): { games: Game[]; stats: MergeStats } {
  const byId = new Map(existing.map((g) => [g.id, { ...g }]))
  const stats: MergeStats = { added: 0, updated: 0, uninstalled: 0, merged: 0 }
  const seen = new Set<string>()

  for (const [scanner, list] of Object.entries(result.ok) as [ScannerId, ScannedGame[]][]) {
    for (const s of list) {
      const id = gameId(s)
      if (seen.has(id)) continue // même jeu listé deux fois (deux bibliothèques Steam…)
      seen.add(id)
      const old = byId.get(id)
      const fresh = { installDir: s.installDir, exe: s.exe ?? old?.exe, launchUri: s.launchUri, steamAppId: s.steamAppId ?? old?.steamAppId, installed: s.installed ?? true }
      if (old) {
        Object.assign(old, fresh, old.nameLocked ? {} : { name: s.name }, old.argsLocked ? {} : { args: s.args, workDir: s.workDir })
        stats.updated++
      } else {
        byId.set(id, { id, platform: s.platform, platformId: s.platformId, name: s.name, args: s.args, workDir: s.workDir, ...fresh, favorite: false, hidden: false, addedAt: now, playtime: 0, collections: [], media: {} })
        stats.added++
      }
    }
    for (const g of byId.values()) {
      if (g.platform === scanner && !seen.has(g.id) && g.installed) { g.installed = false; stats.uninstalled++ }
    }
  }

  // un jeu ajouté à la main dont l'exe est dans le dossier d'un jeu détecté : on fusionne dans le jeu détecté
  const platformGames = [...byId.values()].filter((g) => g.platform !== 'manual' && g.installDir)
  for (const m of [...byId.values()].filter((g) => g.platform === 'manual' && g.exe)) {
    const exe = norm(m.exe)!
    const host = platformGames.find((g) => exe.startsWith(norm(g.installDir)! + '\\'))
    if (!host) continue
    host.playtime += m.playtime
    host.favorite ||= m.favorite
    host.lastPlayed = Math.max(host.lastPlayed ?? 0, m.lastPlayed ?? 0) || undefined
    host.collections = [...new Set([...host.collections, ...m.collections])]
    host.media = { ...m.media, ...host.media }
    byId.delete(m.id)
    stats.merged++
  }
  return { games: [...byId.values()], stats }
}
