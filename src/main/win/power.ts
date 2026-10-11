/* Veille, redémarrage, extinction de Windows */
import { execFile } from 'node:child_process'

export type PowerAction = 'sleep' | 'restart' | 'shutdown'

export function power(a: PowerAction): void {
  if (process.platform !== 'win32') return
  const run = (cmd: string, args: string[]) => execFile(cmd, args, { windowsHide: true })
  if (a === 'shutdown') run('shutdown', ['/s', '/t', '0'])
  if (a === 'restart') run('shutdown', ['/r', '/t', '0'])
  // SetSuspendState : met en veille (hibernation si elle est activée dans Windows, voir README)
  if (a === 'sleep') run('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0'])
}
