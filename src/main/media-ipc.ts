/* Handlers IPC des médias */
import { handle, type Ctx } from './ipc'
import type { Media } from './media'
import { KINDS, type Kind } from './media/sources'
import { str } from './validate'

export function registerMedia(ctx: Ctx, media: Media): void {
  const game = (id: unknown) => {
    const g = ctx.store.games.get(str(id, 300, 'id'))
    if (!g) throw new Error('jeu introuvable')
    return g
  }
  const kind = (k: unknown): Kind => {
    if (!KINDS.includes(k as Kind)) throw new Error('type de média inconnu')
    return k as Kind
  }
  const done = (g: ReturnType<typeof game>) => { ctx.store.save(); return g }

  handle('media:options', async (id, k) => media.options(game(id), kind(k)))
  handle('media:set', async (id, k, url) => {
    const g = game(id), kd = kind(k), local = await media.cache.download(g.id, kd, str(url, 1000, 'url'))
    if (!local) throw new Error('téléchargement impossible')
    g.media[kd] = local
    return done(g)
  })
  handle('media:setFile', async (id, k, path) => {
    const g = game(id), kd = kind(k)
    g.media[kd] = media.cache.fromFile(g.id, kd, str(path, 1000, 'fichier'))
    return done(g)
  })
  handle('media:refresh', async (id) => media.enqueue([game(id).id], true))
}
