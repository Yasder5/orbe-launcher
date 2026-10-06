/* Steam : dossier via le registre, bibliothèques via libraryfolders.vdf, jeux via appmanifest_*.acf. */
import { win32 as path } from 'node:path'
import type { Scanner, ScanEnv, ScannedGame } from './types'
import { get, parseVdf, type Vdf } from './vdf'

// outils et runtimes listés comme des jeux par Steam
const NOT_GAMES = /^(Steamworks Common Redistributables|Steam Linux Runtime.*|Proton.*|SteamVR.*|Steam Controller Configs|Spacewar)$/i
const TOOL_IDS = new Set(['228980', '1070560', '1391110', '1628350', '250820', '1493710'])

export async function steamRoot(env: ScanEnv): Promise<string | null> {
  for (const key of ['HKCU\\Software\\Valve\\Steam', 'HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'HKLM\\SOFTWARE\\Valve\\Steam']) {
    for (const vals of (await env.reg(key)).values()) {
      const p = vals.SteamPath ?? vals.InstallPath
      if (p) return path.normalize(p)
    }
  }
  const def = 'C:\\Program Files (x86)\\Steam'
  return env.exists(def) ? def : null
}

/* Dossiers de bibliothèque : format récent ("0" { "path" … }) et ancien ("1" "D:\\Steam") */
export function libraryPaths(vdfText: string, root: string): string[] {
  const lf = get(parseVdf(vdfText), 'libraryfolders')
  const out = new Set([path.normalize(root)])
  if (lf && typeof lf === 'object') {
    for (const [k, v] of Object.entries(lf)) {
      if (!/^\d+$/.test(k)) continue
      const p = typeof v === 'string' ? v : (get(v, 'path') as string | undefined)
      if (p) out.add(path.normalize(p))
    }
  }
  return [...out]
}

export function parseManifest(acf: string, library: string): ScannedGame | null {
  const st = get(parseVdf(acf), 'AppState') as Vdf | undefined
  const appid = get(st, 'appid'), name = get(st, 'name'), dir = get(st, 'installdir'), flags = Number(get(st, 'StateFlags') ?? 0)
  if (typeof appid !== 'string' || typeof name !== 'string' || TOOL_IDS.has(appid) || NOT_GAMES.test(name)) return null
  return {
    platform: 'steam',
    platformId: appid,
    name,
    steamAppId: appid,
    installDir: typeof dir === 'string' ? path.join(library, 'steamapps', 'common', dir) : undefined,
    launchUri: `steam://rungameid/${appid}`,
    installed: (flags & 4) === 4 // 4 = entièrement installé
  }
}

export const steam: Scanner = {
  id: 'steam',
  name: 'Steam',
  async scan(env) {
    const root = await steamRoot(env)
    if (!root) return []
    const vdf = path.join(root, 'steamapps', 'libraryfolders.vdf')
    const libs = env.exists(vdf) ? libraryPaths(env.readText(vdf), root) : [root]
    const games: ScannedGame[] = []
    for (const lib of libs) {
      const apps = path.join(lib, 'steamapps')
      for (const f of env.list(apps)) {
        if (!/^appmanifest_\d+\.acf$/i.test(f)) continue
        try {
          const g = parseManifest(env.readText(path.join(apps, f)), lib)
          if (g) games.push(g)
        } catch {
          /* manifeste en cours d'écriture par Steam : ignoré ce coup-ci */
        }
      }
    }
    return games
  }
}
