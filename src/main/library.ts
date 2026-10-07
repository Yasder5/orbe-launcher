/* Bibliothèque : scan, ajout manuel, suppression, explorateur de fichiers pour la manette. */
import { randomUUID } from 'node:crypto'
import { readdirSync, statSync } from 'node:fs'
import { dirname, join, parse } from 'node:path'
import type { FsFilter, FsListing, ScanReport } from '../shared/ipc'
import { emit, handle, type Ctx } from './ipc'
import { log } from './log'
import { gameId, mergeScan } from './scanners/merge'
import { runScanners } from './scanners'
import { manualInput, str } from './validate'

const L = log('library')
const EXT: Record<FsFilter, RegExp> = { exe: /\.(exe|bat|cmd|lnk|url)$/i, image: /\.(png|jpe?g|webp|gif)$/i, dir: /^$/ }

export function listDir(dir: string, filter: FsFilter): FsListing {
  if (!dir) {
    // racine : lecteurs disponibles (Windows) ou / ailleurs
    if (process.platform !== 'win32') return listDir('/', filter)
    const drives = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((d) => d + ':\\').filter((d) => { try { statSync(d); return true } catch { return false } })
    return { dir: '', parent: null, entries: drives.map((d) => ({ name: d, path: d, dir: true })) }
  }
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.') && !e.name.startsWith('$') && (e.isDirectory() || EXT[filter].test(e.name)))
    .map((e) => ({ name: e.name, path: join(dir, e.name), dir: e.isDirectory() }))
    .sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  const root = parse(dir).root
  return { dir, parent: dir === root ? '' : dirname(dir), entries: entries.slice(0, 2000) }
}

export function registerLibrary(ctx: Ctx): { rescan: () => Promise<ScanReport> } {
  const { store } = ctx
  let running: Promise<ScanReport> | null = null

  const rescan = () =>
    (running ??= (async () => {
      emit(ctx.win(), 'scan:state', { running: true })
      const res = await runScanners(store.settings)
      const { games, stats } = mergeScan(store.list(), res)
      store.games = new Map(games.map((g) => [g.id, g]))
      store.save()
      const report = { ...stats, failed: res.failed, total: games.length }
      L.info('scan terminé', report)
      emit(ctx.win(), 'library:changed', store.list())
      emit(ctx.win(), 'scan:state', { running: false, report })
      return report
    })().finally(() => { running = null }))

  handle('library:rescan', rescan)
  handle('library:addManual', async (input) => {
    const m = manualInput(input)
    const g = { id: gameId({ platform: 'manual', platformId: randomUUID() }), platform: 'manual' as const, platformId: '', ...m, installDir: dirname(m.exe), installed: true, favorite: false, hidden: false, addedAt: Date.now(), playtime: 0, collections: [], media: {}, nameLocked: true, argsLocked: true }
    g.platformId = g.id.slice('manual:'.length)
    store.games.set(g.id, g)
    store.save()
    emit(ctx.win(), 'library:changed', store.list())
    return g
  })
  handle('library:remove', async (id) => {
    const g = store.games.get(str(id, 300, 'id'))
    if (!g) return
    if (g.platform === 'manual') store.games.delete(g.id)
    else g.hidden = true // un jeu détecté reviendrait au prochain scan : on le masque
    store.save()
    emit(ctx.win(), 'library:changed', store.list())
  })
  handle('fs:list', async (dir, filter) => listDir(str(dir, 1000, 'dossier'), filter in EXT ? filter : 'exe'))
  return { rescan }
}
