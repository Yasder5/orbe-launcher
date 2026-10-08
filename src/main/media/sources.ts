/* Sources de médias : SteamGridDB (clé API), CDN Steam, API du store Steam. Fonctions sans état, `fetch` injectable pour les tests. */
import type { GameInfo } from '../../shared/types'

export type Kind = 'cover' | 'hero' | 'logo' | 'icon'
export const KINDS: Kind[] = ['cover', 'hero', 'logo', 'icon']
export interface MediaOption { url: string; thumb: string; width?: number; height?: number }
type Fetch = typeof fetch

const SGDB = 'https://www.steamgriddb.com/api/v2'
const SGDB_PATH: Record<Kind, string> = {
  cover: 'grids/game/{id}?dimensions=600x900,342x482,660x930&types=static',
  hero: 'heroes/game/{id}?types=static',
  logo: 'logos/game/{id}?types=static',
  icon: 'icons/game/{id}?types=static'
}

/* Hôtes d'où le processus principal accepte de télécharger une image (pas de requête vers une adresse arbitraire) */
export const ALLOWED_HOSTS = ['cdn2.steamgriddb.com', 'cdn.cloudflare.steamstatic.com', 'shared.steamstatic.com', 'shared.cloudflare.steamstatic.com', 'cdn.akamai.steamstatic.com', 'shared.akamai.steamstatic.com', 'steamcdn-a.akamaihd.net']
export const allowedUrl = (u: string) => { try { const x = new URL(u); return x.protocol === 'https:' && ALLOWED_HOSTS.includes(x.hostname) } catch { return false } }

export const normName = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[™®©]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

export class SteamGridDB {
  constructor(private key: string, private f: Fetch = fetch) {}
  private async get<T>(path: string): Promise<T | null> {
    const r = await this.f(`${SGDB}/${path}`, { headers: { Authorization: `Bearer ${this.key}` }, signal: AbortSignal.timeout(15000) })
    if (r.status === 401 || r.status === 403) throw new Error('clé SteamGridDB refusée')
    if (!r.ok) return null
    const j = (await r.json()) as { success: boolean; data: T }
    return j.success ? j.data : null
  }
  /* Identifiant SteamGridDB : par l'appid Steam si on l'a, sinon par le nom (correspondance exacte d'abord) */
  async gameId(name: string, steamAppId?: string): Promise<number | null> {
    if (steamAppId) {
      const g = await this.get<{ id: number }>(`games/steam/${steamAppId}`)
      if (g) return g.id
    }
    const found = (await this.get<{ id: number; name: string }[]>(`search/autocomplete/${encodeURIComponent(name)}`)) ?? []
    return (found.find((x) => normName(x.name) === normName(name)) ?? found[0])?.id ?? null
  }
  async options(id: number, kind: Kind): Promise<MediaOption[]> {
    const d = (await this.get<{ url: string; thumb: string; width: number; height: number }[]>(SGDB_PATH[kind].replace('{id}', String(id)))) ?? []
    return d.map((x) => ({ url: x.url, thumb: x.thumb, width: x.width, height: x.height }))
  }
}

/* CDN Steam : chemins classiques, encore valables pour la très grande majorité des jeux */
export function steamCdn(appid: string, kind: Kind): string[] {
  const old = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}`
  const b = `https://shared.steamstatic.com/store_item_assets/steam/apps/${appid}`
  return {
    cover: [`${old}/library_600x900_2x.jpg`, `${b}/library_600x900_2x.jpg`, `${old}/library_600x900.jpg`],
    hero: [`${old}/library_hero.jpg`, `${b}/library_hero.jpg`],
    logo: [`${old}/logo.png`, `${b}/logo.png`],
    icon: [] as string[]
  }[kind]
}

/* Infos du store Steam (description courte, genres, date) */
export async function steamInfo(appid: string, lang: 'fr' | 'en', f: Fetch = fetch): Promise<GameInfo | null> {
  const r = await f(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=${lang === 'fr' ? 'french' : 'english'}`, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) return null
  const j = (await r.json()) as Record<string, { success: boolean; data?: { short_description?: string; genres?: { description: string }[]; release_date?: { date?: string }; developers?: string[] } }>
  const d = j[appid]?.success ? j[appid].data : undefined
  if (!d) return null
  const strip = (s?: string) => s?.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim()
  return { description: strip(d.short_description), genres: d.genres?.map((g) => g.description).slice(0, 4), releaseDate: d.release_date?.date, developer: d.developers?.[0] }
}

/* Trouve l'appid Steam d'un jeu d'une autre plateforme (nom identique uniquement, pour ne pas se tromper de jeu) */
export async function steamSearch(name: string, f: Fetch = fetch): Promise<string | null> {
  const r = await f(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&l=english&cc=FR`, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) return null
  const j = (await r.json()) as { items?: { id: number; name: string }[] }
  return j.items?.find((i) => normName(i.name) === normName(name))?.id.toString() ?? null
}
