/* Ubisoft Connect : jeux installés dans le registre, lancement via uplay://. Le nom vient du dossier d'installation. */
import { win32 as path } from 'node:path'
import { children } from './reg'
import type { Scanner, ScannedGame } from './types'

export const UBI_KEY = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs'

export function ubisoftFromReg(map: Map<string, Record<string, string>>): ScannedGame[] {
  const out: ScannedGame[] = []
  for (const [id, v] of children(map, UBI_KEY)) {
    const dir = v.InstallDir
    if (!dir || !/^\d+$/.test(id)) continue
    const clean = path.normalize(dir.replace(/\//g, '\\'))
    out.push({ platform: 'ubisoft', platformId: id, name: path.basename(clean), installDir: clean, launchUri: `uplay://launch/${id}/0`, installed: true })
  }
  return out
}

export const ubisoft: Scanner = {
  id: 'ubisoft',
  name: 'Ubisoft Connect',
  async scan(env) {
    return ubisoftFromReg(await env.reg(UBI_KEY)).filter((g) => env.exists(g.installDir!))
  }
}
