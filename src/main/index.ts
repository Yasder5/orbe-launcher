/* Processus principal : fenêtre plein écran, stockage, IPC. */
import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { emit, handle, registerCore } from './ipc'
import { registerLibrary } from './library'
import { initLog, log } from './log'
import { Store } from './store'
import { registerThemeScheme, Themes } from './themes'

// Toutes les données dans %APPDATA%/OrbeLauncher (réglages, bibliothèque, cache, logs)
const dataDir = join(app.getPath('appData'), 'OrbeLauncher')
app.setPath('userData', dataDir)
initLog(join(dataDir, 'logs'))
const L = log('main')
process.on('uncaughtException', (e) => L.error('exception non gérée', e))
process.on('unhandledRejection', (e) => L.error('promesse rejetée', e))

if (!app.requestSingleInstanceLock()) app.quit()
registerThemeScheme()

let win: BrowserWindow | null = null
const store = new Store(dataDir)
const themes = new Themes(dataDir)

function createWindow(): BrowserWindow {
  const w = new BrowserWindow({
    width: 1600,
    height: 900,
    fullscreen: store.settings.fullscreen && !process.env.ELECTRON_RENDERER_URL,
    kiosk: store.settings.kiosk,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    show: false,
    title: 'Orbe Launcher',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: true
    }
  })
  w.once('ready-to-show', () => w.show())
  // aucune navigation ni nouvelle fenêtre : les liens externes ne s'ouvrent pas dans le launcher
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  w.webContents.on('will-navigate', (e) => e.preventDefault())
  if (process.env.ELECTRON_RENDERER_URL) w.loadURL(process.env.ELECTRON_RENDERER_URL)
  else w.loadFile(join(__dirname, '../renderer/index.html'))
  return w
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.whenReady().then(() => {
  const ctx = {
    store,
    dataDir,
    win: () => win,
    onSettings: (s: typeof store.settings, before: typeof store.settings) => {
      if (win && s.fullscreen !== before.fullscreen) win.setFullScreen(s.fullscreen)
    }
  }
  registerCore(ctx)
  const library = registerLibrary(ctx)
  themes.registerProtocol()
  handle('themes:list', async () => themes.list())
  themes.watch((id) => emit(win, 'themes:changed', { id, themes: themes.list() }))
  win = createWindow()
  L.info('démarrage', app.getVersion())
  win.webContents.once('did-finish-load', () => library.rescan()) // scan au démarrage, l'interface affiche déjà la bibliothèque connue
})

app.on('before-quit', () => store.flush())
app.on('window-all-closed', () => app.quit())
