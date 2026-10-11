/* Dossiers de jeux choisis dans les paramètres (ex. D:\Jeux) : chaque sous-dossier est un jeu, son exe principal est le plus gros .exe
   qui n'est pas un outil (installeur, rapport de plantage…), cherché sur 3 niveaux. */
import { createHash } from 'node:crypto'
import { statSync } from 'node:fs'
import { win32 as path } from 'node:path'
import type { Scanner, ScanEnv, ScannedGame } from './types'

const NOT_GAME = /(unins\d*|setup|install|crash|report|redist|vcredist|dxsetup|helper|updater|launcher_?update|ue4prereq|dotnet|vc_redist)/i

export function mainExe(env: ScanEnv, dir: string, size: (p: string) => number, depth = 3): string | null {
  let best: { p: string; s: number } | null = null
  const walk = (d: string, n: number) => {
    for (const f of env.list(d)) {
      const p = path.join(d, f)
      if (/\.exe$/i.test(f)) {
        if (NOT_GAME.test(f)) continue
        const s = size(p)
        if (!best || s > best.s) best = { p, s }
      } else if (n > 0 && !f.includes('.') && !/^(redist|_commonredist|directx|support|__installer|engine)$/i.test(f)) walk(p, n - 1)
    }
  }
  walk(dir, depth)
  return (best as { p: string } | null)?.p ?? null
}

export function folderScanner(folders: () => string[], size = (p: string) => { try { return statSync(p).size } catch { return 0 } }): Scanner {
  return {
    id: 'folder',
    name: 'Dossiers',
    async scan(env) {
      const out: ScannedGame[] = []
      for (const root of folders()) {
        for (const sub of env.list(root)) {
          const dir = path.join(root, sub), exe = mainExe(env, dir, size)
          if (!exe) continue
          out.push({ platform: 'folder', platformId: createHash('sha1').update(dir.toLowerCase()).digest('hex').slice(0, 16), name: sub, installDir: dir, exe, workDir: path.dirname(exe), installed: true })
        }
      }
      return out
    }
  }
}
