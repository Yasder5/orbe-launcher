/* Filtre, tri et recherche de la bibliothèque (pur, testé) */
import type { Game, Platform } from '@shared/types'

export type Filter = 'all' | 'installed' | 'favorites' | Platform
export type Sort = 'name' | 'playtime' | 'recent' | 'added'
export const SORTS: Sort[] = ['name', 'playtime', 'recent', 'added']

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function filterGames(games: Game[], o: { filter: Filter; sort: Sort; query: string }): Game[] {
  const q = fold(o.query.trim())
  const words = q ? q.split(/\s+/) : []
  const out = games.filter((g) => {
    if (o.filter === 'installed' && !g.installed) return false
    if (o.filter === 'favorites' && !g.favorite) return false
    if (o.filter !== 'all' && o.filter !== 'installed' && o.filter !== 'favorites' && g.platform !== o.filter) return false
    const name = fold(g.name)
    return words.every((w) => name.includes(w)) // « witcher 3 » trouve « The Witcher 3: Wild Hunt »
  })
  const byName = (a: Game, b: Game) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base', numeric: true })
  const cmp: Record<Sort, (a: Game, b: Game) => number> = {
    name: byName,
    playtime: (a, b) => b.playtime - a.playtime || byName(a, b),
    recent: (a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) || byName(a, b),
    added: (a, b) => b.addedAt - a.addedAt || byName(a, b)
  }
  return out.sort(cmp[o.sort])
}
