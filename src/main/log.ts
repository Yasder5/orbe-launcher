/* Journal fichier : %APPDATA%/OrbeLauncher/logs/AAAA-MM-JJ.log, 14 jours gardés. Jamais de clé API dans les messages. */
import { appendFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

let dir = ''

export function initLog(logDir: string): void {
  dir = logDir
  mkdirSync(dir, { recursive: true })
  const files = readdirSync(dir).filter((f) => f.endsWith('.log')).sort()
  for (const f of files.slice(0, -14)) unlinkSync(join(dir, f))
}

function write(level: string, scope: string, msg: unknown[]): void {
  const now = new Date()
  const text = msg.map((m) => (m instanceof Error ? (m.stack ?? m.message) : typeof m === 'string' ? m : JSON.stringify(m))).join(' ')
  const line = `${now.toISOString()} ${level} [${scope}] ${text}\n`
  if (process.env.ELECTRON_RENDERER_URL || level === 'ERROR') process.stderr.write(line)
  if (!dir) return
  try {
    appendFileSync(join(dir, now.toISOString().slice(0, 10) + '.log'), line)
  } catch {
    /* disque plein ou dossier supprimé : on ne plante pas pour un log */
  }
}

export const log = (scope: string) => ({
  info: (...m: unknown[]) => write('INFO', scope, m),
  warn: (...m: unknown[]) => write('WARN', scope, m),
  error: (...m: unknown[]) => write('ERROR', scope, m)
})
