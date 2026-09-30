/* Thèmes : dossiers livrés (resources/themes) + dossiers de l'utilisateur (%APPDATA%/OrbeLauncher/themes, prioritaires).
   Fichiers servis par le protocole orbe-theme://<id>/<chemin> ; rechargement à chaud quand un fichier change. */
import { existsSync, mkdirSync, readdirSync, readFileSync, watch, type FSWatcher } from 'node:fs'
import { join, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, net, protocol } from 'electron'
import type { ThemeEntry } from '../shared/ipc'
import { validateTheme, safeJoin } from '../shared/theme'
import { log } from './log'

const L = log('themes')


export class Themes {
  private dirs = new Map<string, string>() // id -> dossier
  private watchers: FSWatcher[] = []
  readonly userDir: string
  readonly builtinDir: string

  constructor(dataDir: string) {
    this.userDir = join(dataDir, 'themes')
    this.builtinDir = app.isPackaged ? join(process.resourcesPath, 'themes') : join(app.getAppPath(), 'themes')
    mkdirSync(this.userDir, { recursive: true })
  }

  list(): ThemeEntry[] {
    const out = new Map<string, ThemeEntry>()
    this.dirs.clear()
    for (const [root, builtin] of [[this.builtinDir, true], [this.userDir, false]] as const) {
      if (!existsSync(root)) continue
      for (const d of readdirSync(root, { withFileTypes: true })) {
        if (!d.isDirectory()) continue
        const file = join(root, d.name, 'theme.json')
        if (!existsSync(file)) continue
        try {
          const check = validateTheme(JSON.parse(readFileSync(file, 'utf8')), d.name)
          if (!check.theme) { L.warn('thème refusé', d.name, check.errors); continue }
          if (check.warnings.length) L.warn('thème', d.name, check.warnings)
          out.set(d.name, { manifest: check.theme, base: `orbe-theme://${d.name}/`, builtin, warnings: check.warnings })
          this.dirs.set(d.name, join(root, d.name))
        } catch (e) {
          L.error('theme.json illisible', file, e) // un thème cassé ne casse pas les autres
        }
      }
    }
    return [...out.values()]
  }

  registerProtocol(): void {
    protocol.handle('orbe-theme', (req) => {
      const u = new URL(req.url)
      if (!this.dirs.size) this.list()
      const root = this.dirs.get(u.hostname)
      const file = root && safeJoin(root, u.pathname, sep)
      if (!file || !existsSync(file)) return new Response('introuvable', { status: 404 })
      return net.fetch(pathToFileURL(file).toString())
    })
  }

  /* Surveille les dossiers ; cb(id) quand un thème change. Dossier livré surveillé seulement en dev. */
  watch(cb: (id: string) => void): void {
    const roots = app.isPackaged ? [this.userDir] : [this.builtinDir, this.userDir]
    const timers = new Map<string, NodeJS.Timeout>()
    for (const root of roots) {
      if (!existsSync(root)) continue
      try {
        this.watchers.push(
          watch(root, { recursive: true }, (_ev, name) => {
            const id = String(name ?? '').split(/[\\/]/)[0]
            if (!id) return
            clearTimeout(timers.get(id))
            timers.set(id, setTimeout(() => cb(id), 200)) // un enregistrement = plusieurs événements
          })
        )
      } catch (e) {
        L.warn('surveillance impossible', root, e)
      }
    }
  }
}

/* À appeler avant app.ready */
export function registerThemeScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'orbe-theme', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
    { scheme: 'orbe-media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
  ])
}
