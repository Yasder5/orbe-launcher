/* Reconnaît le processus d'un jeu (pur, testé) : un exe situé dans le dossier d'installation, hors outils annexes. */
import type { Proc } from '../win/procs'

// processus qui tournent dans le dossier d'un jeu sans être le jeu
const NOT_GAME = /(crash|report|handler|helper|launcher_?updater|unins\d*|setup|redist|vc_?redist|dxsetup|easyanticheat_setup|be_?service|cefsharp|webhelper|ue4prereq|dotnet)[^\\/]*\.exe$/i

const norm = (p: string) => p.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase()

export function findGameProcs(procs: Proc[], opts: { installDir?: string; exe?: string; selfPid?: number }): Proc[] {
  const dir = opts.installDir ? norm(opts.installDir) + '\\' : null
  const exe = opts.exe ? norm(opts.exe) : null
  return procs.filter((p) => {
    if (p.pid === opts.selfPid) return false
    const path = norm(p.path)
    if (exe && path === exe) return true
    return !!dir && path.startsWith(dir) && path.endsWith('.exe') && !NOT_GAME.test(path)
  })
}
