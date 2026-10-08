/* Cache disque des images (%APPDATA%/OrbeLauncher/media), servi par orbe-media://m/<fichier>. */
import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { extname, join, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { net, protocol } from 'electron'
import { safeJoin } from '../../shared/theme'
import { allowedUrl, type Kind } from './sources'

const MAX = 15 * 1024 * 1024
const TYPES: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/x-icon': '.ico', 'image/vnd.microsoft.icon': '.ico' }

export class MediaCache {
  constructor(readonly dir: string) {
    mkdirSync(dir, { recursive: true })
  }
  private base(gameId: string, kind: Kind) {
    return gameId.replace(/[^\w-]/g, '_') + '-' + kind
  }
  private clear(gameId: string, kind: Kind) {
    const b = this.base(gameId, kind) + '.'
    for (const f of readdirSync(this.dir)) if (f.startsWith(b)) unlinkSync(join(this.dir, f))
  }
  private url(file: string) {
    return `orbe-media://m/${encodeURIComponent(file)}?v=${Date.now()}` // ?v= : l'image change même si le nom reste
  }

  /* Télécharge une image (hôtes autorisés seulement), renvoie son URL locale ou null */
  async download(gameId: string, kind: Kind, url: string): Promise<string | null> {
    if (!allowedUrl(url)) throw new Error('adresse d’image non autorisée')
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) })
    if (!r.ok) return null
    const type = (r.headers.get('content-type') ?? '').split(';')[0].trim()
    const ext = TYPES[type]
    if (!ext || Number(r.headers.get('content-length') ?? 0) > MAX) return null
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length > MAX || buf.length < 100) return null
    this.clear(gameId, kind)
    const file = this.base(gameId, kind) + ext
    writeFileSync(join(this.dir, file), buf)
    return this.url(file)
  }

  /* Image choisie sur le disque par l'utilisateur : copiée dans le cache (le fichier d'origine peut disparaître) */
  fromFile(gameId: string, kind: Kind, path: string): string {
    const ext = extname(path).toLowerCase()
    if (!['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) throw new Error('image png, jpg, webp ou gif attendue')
    this.clear(gameId, kind)
    const file = this.base(gameId, kind) + ext
    copyFileSync(path, join(this.dir, file))
    return this.url(file)
  }

  registerProtocol(): void {
    protocol.handle('orbe-media', (req) => {
      const file = safeJoin(this.dir, new URL(req.url).pathname, sep)
      if (!file || !existsSync(file)) return new Response('introuvable', { status: 404 })
      return net.fetch(pathToFileURL(file).toString())
    })
  }
}
