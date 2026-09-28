/* Enregistre les handlers IPC. Seule la page de l'appli peut appeler ; chaque entrée est validée. */
import { randomUUID } from 'node:crypto'
import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import type { Api, Channel, EventName, Events } from '../shared/ipc'
import { log } from './log'
import type { Store } from './store'
import { gamePatch, settingsPatch, str } from './validate'

const L = log('ipc')

export interface Ctx {
  store: Store
  win: () => BrowserWindow | null
  dataDir: string
  onSettings: (s: import('../shared/types').Settings, before: import('../shared/types').Settings) => void
}

export function emit<E extends EventName>(win: BrowserWindow | null, event: E, payload: Events[E]): void {
  if (win && !win.isDestroyed()) win.webContents.send(event, payload)
}

/* Refuse les appels qui ne viennent pas de notre page (iframe, page externe chargée par erreur) */
function trusted(e: IpcMainInvokeEvent): boolean {
  const url = e.senderFrame?.url ?? ''
  return url.startsWith('file://') || (!!process.env.ELECTRON_RENDERER_URL && url.startsWith(process.env.ELECTRON_RENDERER_URL))
}

export function handle<C extends Channel>(channel: C, fn: Api[C]): void {
  ipcMain.handle(channel, async (e, ...args: unknown[]) => {
    if (!trusted(e)) throw new Error('appel refusé')
    try {
      return await (fn as (...a: unknown[]) => unknown)(...args)
    } catch (err) {
      L.error(channel, err)
      throw err
    }
  })
}

export function registerCore(ctx: Ctx): void {
  const { store } = ctx
  const changed = () => {
    store.save()
    emit(ctx.win(), 'library:changed', store.list())
  }

  handle('app:info', async () => ({ version: app.getVersion(), platform: process.platform, dataDir: ctx.dataDir, dev: !app.isPackaged }))
  handle('library:list', async () => store.list())
  handle('library:update', async (id, patch) => {
    const g = store.games.get(str(id, 300, 'id'))
    if (!g) throw new Error('jeu introuvable')
    Object.assign(g, gamePatch(patch))
    changed()
    return g
  })

  handle('collections:list', async () => store.collections)
  handle('collections:create', async (name) => {
    const c = { id: randomUUID(), name: str(name, 60, 'nom').trim() || 'Collection', createdAt: Date.now() }
    store.collections.push(c)
    store.save()
    return c
  })
  handle('collections:rename', async (id, name) => {
    const c = store.collections.find((x) => x.id === id)
    if (c) c.name = str(name, 60, 'nom').trim() || c.name
    store.save()
  })
  handle('collections:delete', async (id) => {
    store.collections = store.collections.filter((c) => c.id !== id)
    for (const g of store.games.values()) g.collections = g.collections.filter((c) => c !== id)
    changed()
  })

  handle('settings:get', async () => store.settings)
  handle('settings:set', async (patch) => {
    const before = { ...store.settings }
    store.settings = { ...store.settings, ...settingsPatch(patch) }
    store.save()
    ctx.onSettings(store.settings, before)
    emit(ctx.win(), 'settings:changed', store.settings)
    return store.settings
  })
}
