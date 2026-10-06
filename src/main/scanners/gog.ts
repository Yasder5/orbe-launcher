/* GOG Galaxy : une sous-clé de registre par jeu, lancement direct de l'exe (Galaxy pas nécessaire). */
import { win32 as path } from 'node:path'
import { children } from './reg'
import type { Scanner, ScannedGame } from './types'

export const GOG_KEY = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\GOG.com\\Games'

export function gogFromReg(map: Map<string, Record<string, string>>): ScannedGame[] {
  const out: ScannedGame[] = []
  for (const [id, v] of children(map, GOG_KEY)) {
    if (v.dependsOn) continue // DLC
    const name = v.gameName ?? v.GAMENAME, exe = v.exe ?? v.EXE, dir = v.path ?? v.PATH
    if (!name || !exe) continue
    out.push({
      platform: 'gog',
      platformId: v.gameID ?? id,
      name,
      installDir: dir ? path.normalize(dir) : path.dirname(exe),
      exe: path.normalize(exe),
      args: v.launchParam || undefined,
      workDir: v.workingDir ? path.normalize(v.workingDir) : undefined,
      installed: true
    })
  }
  return out
}

export const gog: Scanner = {
  id: 'gog',
  name: 'GOG Galaxy',
  async scan(env) {
    return gogFromReg(await env.reg(GOG_KEY)).filter((g) => env.exists(g.exe!))
  }
}
