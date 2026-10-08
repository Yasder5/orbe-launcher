/* Récupération des médias en tâche de fond : SteamGridDB si une clé est saisie, sinon CDN Steam ; infos du store Steam.
   File d'attente à 3 téléchargements simultanés ; sans image, l'interface dessine une jaquette au style du thème. */
import type { Game } from '../../shared/types'
import { emit, type Ctx } from '../ipc'
import { log } from '../log'
import { MediaCache } from './cache'
import { KINDS, steamCdn, SteamGridDB, steamInfo, steamSearch, type Kind, type MediaOption } from './sources'

const L = log('media')

export class Media {
  private queue: string[] = []
  private active = 0
  private emitTimer: NodeJS.Timeout | null = null
  private badKey = false

  constructor(private ctx: Ctx, readonly cache: MediaCache) {}

  private sgdb(): SteamGridDB | null {
    const k = this.ctx.store.settings.steamGridDbKey
    return k && !this.badKey ? new SteamGridDB(k) : null
  }
  keyChanged(): void {
    this.badKey = false
  }

  /* L'interface est prévenue au plus toutes les 1,5 s (pas à chaque image) */
  private changed(): void {
    this.ctx.store.save()
    this.emitTimer ??= setTimeout(() => { this.emitTimer = null; emit(this.ctx.win(), 'library:changed', this.ctx.store.list()) }, 1500)
  }

  async options(g: Game, kind: Kind): Promise<MediaOption[]> {
    const sg = this.sgdb()
    if (sg) {
      g.sgdbId ??= (await sg.gameId(g.name, g.steamAppId)) ?? undefined
      if (g.sgdbId) return (await sg.options(g.sgdbId, kind)).slice(0, 40)
    }
    return g.steamAppId ? steamCdn(g.steamAppId, kind).map((url) => ({ url, thumb: url })) : []
  }

  private async fill(g: Game, force: boolean): Promise<void> {
    if (!g.steamAppId && !g.steamSearched && g.platform !== 'steam') {
      g.steamSearched = true // une seule recherche par jeu
      g.steamAppId = (await steamSearch(g.name).catch(() => null)) ?? undefined
    }
    const sg = this.sgdb()
    for (const kind of KINDS) {
      if (g.media[kind] && !force) continue
      const urls: string[] = []
      if (sg) {
        try {
          g.sgdbId ??= (await sg.gameId(g.name, g.steamAppId)) ?? undefined
          if (g.sgdbId) urls.push(...(await sg.options(g.sgdbId, kind)).slice(0, 2).map((o) => o.url))
        } catch (e) {
          if (String(e).includes('refusée')) { this.badKey = true; L.warn('clé SteamGridDB refusée, CDN Steam seulement') } else L.warn('SteamGridDB', g.name, e)
        }
      }
      if (g.steamAppId) urls.push(...steamCdn(g.steamAppId, kind))
      for (const u of urls) {
        const local = await this.cache.download(g.id, kind, u).catch(() => null)
        if (local) { g.media[kind] = local; break }
      }
    }
    if ((!g.info || force) && g.steamAppId) g.info = (await steamInfo(g.steamAppId, this.ctx.store.settings.language).catch(() => null)) ?? g.info
    g.mediaCheckedAt = Date.now()
  }

  /* Ajoute des jeux à la file ; force = re-télécharger même s'ils ont déjà des images */
  enqueue(ids: string[], force = false): void {
    for (const id of ids) if (!this.queue.includes(id)) this.queue.push(force ? '!' + id : id)
    this.pump()
  }

  /* Jeux sans jaquette, pas revus depuis une semaine */
  missing(): string[] {
    const week = Date.now() - 7 * 864e5
    return this.ctx.store.list().filter((g) => !g.hidden && (!g.media.cover || !g.media.hero) && (g.mediaCheckedAt ?? 0) < week).map((g) => g.id)
  }

  private pump(): void {
    while (this.active < 3 && this.queue.length) {
      const item = this.queue.shift()!, force = item.startsWith('!'), g = this.ctx.store.games.get(force ? item.slice(1) : item)
      if (!g) continue
      this.active++
      this.fill(g, force)
        .catch((e) => L.warn('médias', g.name, e))
        .finally(() => { this.active--; this.changed(); this.pump() })
    }
  }
}
