/* Liste des processus avec le chemin de leur exe. Windows : Win32 via koffi (rapide, pas de PowerShell). Linux : /proc (développement). */
import { readdirSync, readlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import { log } from '../log'

export interface Proc { pid: number; path: string }
const L = log('procs')

type Win = { list: () => Proc[] }
let win: Win | null | undefined

function loadWin(): Win | null {
  try {
    const koffi = createRequire(__filename)('koffi') as typeof import('koffi')
    const k32 = koffi.load('kernel32.dll')
    const EnumProcesses = k32.func('bool __stdcall K32EnumProcesses(void *ids, uint32_t cb, void *needed)')
    const OpenProcess = k32.func('void * __stdcall OpenProcess(uint32_t access, bool inherit, uint32_t pid)')
    const QueryName = k32.func('bool __stdcall QueryFullProcessImageNameW(void *h, uint32_t flags, void *buf, void *size)')
    const CloseHandle = k32.func('bool __stdcall CloseHandle(void *h)')
    const QUERY_LIMITED = 0x1000
    return {
      list() {
        const ids = new Uint32Array(4096), needed = new Uint32Array(1)
        if (!EnumProcesses(ids, ids.byteLength, needed)) return []
        const out: Proc[] = [], buf = new Uint16Array(1024), size = new Uint32Array(1)
        for (let i = 0; i < needed[0] / 4; i++) {
          const pid = ids[i]
          if (!pid) continue
          const h = OpenProcess(QUERY_LIMITED, false, pid)
          if (!h) continue // processus protégé ou système
          size[0] = buf.length
          if (QueryName(h, 0, buf, size)) out.push({ pid, path: String.fromCharCode(...buf.subarray(0, size[0])) })
          CloseHandle(h)
        }
        return out
      }
    }
  } catch (e) {
    L.error('koffi indisponible, suivi des processus désactivé', e)
    return null
  }
}

export function listProcesses(): Proc[] {
  if (process.platform === 'win32') {
    if (win === undefined) win = loadWin()
    return win?.list() ?? []
  }
  const out: Proc[] = []
  for (const d of readdirSync('/proc')) {
    if (!/^\d+$/.test(d)) continue
    try { out.push({ pid: +d, path: readlinkSync(`/proc/${d}/exe`) }) } catch { /* processus d'un autre utilisateur */ }
  }
  return out
}
