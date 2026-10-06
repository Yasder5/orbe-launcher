/* Lance les scanners actifs en parallèle ; un scanner qui échoue ou traîne est ignoré et journalisé. */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import type { ScannerId, Settings } from '../../shared/types'
import { log } from '../log'
import { ea } from './ea'
import { epic } from './epic'
import { gog } from './gog'
import { regQuery } from './reg'
import { steam } from './steam'
import type { Scanner, ScanEnv, ScannedGame } from './types'
import { ubisoft } from './ubisoft'

const L = log('scan')
export const ALL_SCANNERS: Scanner[] = [steam, epic, gog, ubisoft, ea]

export const realEnv: ScanEnv = {
  programData: process.env.PROGRAMDATA ?? 'C:\\ProgramData',
  reg: regQuery,
  exists: (p) => existsSync(p),
  readText: (p) => readFileSync(p, 'utf8'),
  list: (d) => { try { return readdirSync(d) } catch { return [] } }
}

export interface ScanResult {
  ok: Partial<Record<ScannerId, ScannedGame[]>> // scanners terminés (même avec 0 jeu)
  failed: ScannerId[]
}

const withTimeout = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`délai dépassé (${ms} ms)`)), ms))])

export async function runScanners(settings: Settings, env: ScanEnv = realEnv, scanners = ALL_SCANNERS): Promise<ScanResult> {
  const res: ScanResult = { ok: {}, failed: [] }
  await Promise.all(
    scanners.filter((s) => settings.scanners[s.id]).map(async (s) => {
      const t = Date.now()
      try {
        res.ok[s.id] = await withTimeout(s.scan(env), 30000)
        L.info(s.name, res.ok[s.id]!.length, 'jeux en', Date.now() - t, 'ms')
      } catch (e) {
        res.failed.push(s.id)
        L.error(s.name, 'a échoué', e)
      }
    })
  )
  return res
}
