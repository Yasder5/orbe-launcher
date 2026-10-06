/* Lecture du registre Windows via reg.exe (pas de module natif). Parseur pur, testé. */
import { execFile } from 'node:child_process'

/* Sortie de `reg query <clé> /s` -> clé complète -> { nomDeValeur: donnée } ; la valeur par défaut a le nom "" */
export function parseReg(out: string): Map<string, Record<string, string>> {
  const res = new Map<string, Record<string, string>>()
  let cur: Record<string, string> | null = null
  for (const raw of out.split(/\r?\n/)) {
    if (!raw.trim()) continue
    if (/^HKEY_/i.test(raw)) {
      cur = {}
      res.set(raw.trim().toUpperCase(), cur)
      continue
    }
    const m = raw.match(/^\s{2,}(.*?)\s{2,}(REG_\w+)(?:\s{2,}(.*))?$/)
    if (m && cur) cur[m[1] === '(Default)' || m[1] === '(par défaut)' ? '' : m[1]] = m[3] ?? ''
  }
  return res
}

export function regQuery(key: string): Promise<Map<string, Record<string, string>>> {
  if (process.platform !== 'win32') return Promise.resolve(new Map())
  return new Promise((resolve) => {
    execFile('reg', ['query', key, '/s'], { windowsHide: true, timeout: 15000, maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => {
      resolve(err ? new Map() : parseReg(stdout)) // clé absente = rien d'installé, pas une erreur
    })
  })
}

/* Sous-clés directes d'une clé (une entrée par jeu chez GOG / Ubisoft) */
export function children(map: Map<string, Record<string, string>>, parent: string): [string, Record<string, string>][] {
  const p = parent.toUpperCase() + '\\'
  return [...map].filter(([k]) => k.startsWith(p) && !k.slice(p.length).includes('\\')).map(([k, v]) => [k.slice(p.length), v])
}
