/* Lancement d'un jeu et suivi de la session :
   1. lancement (protocole de la plateforme ou exe direct)
   2. attente du vrai processus du jeu (jusqu'à 3 min : mise à jour Steam/Epic, launcher éditeur…)
   3. le launcher passe en arrière-plan et met ses animations en pause
   4. fin du processus = fin de session : temps de jeu enregistré, retour au premier plan */
import { spawn } from 'node:child_process'
import { dirname } from 'node:path'
import { shell } from 'electron'
import type { Game } from '../../shared/types'
import { emit, type Ctx } from '../ipc'
import { log } from '../log'
import { listProcesses } from '../win/procs'
import { findGameProcs } from './match'

const L = log('session')
const POLL = 3000, WAIT_START = 180_000, END_GRACE = 2 // 2 relevés vides d'affilée (6 s) = jeu fermé
const SCHEMES = /^(steam|com\.epicgames\.launcher|uplay|origin2?|link2ea|goggalaxy):\/\//i

/* Arguments en ligne de commande, guillemets respectés */
export function splitArgs(s?: string): string[] {
  return (s?.match(/"[^"]*"|\S+/g) ?? []).map((a) => a.replace(/^"|"$/g, ''))
}

export interface Running { gameId: string; start: number; tracked: boolean }

export class Sessions {
  running: Running | null = null
  private timer: NodeJS.Timeout | null = null

  constructor(private ctx: Ctx, private toFront: () => void, private toBack: () => void) {}

  async launch(g: Game): Promise<void> {
    if (this.running) throw new Error('un jeu est déjà lancé')
    L.info('lancement', g.name, g.id)
    let child: number | undefined
    if (g.launchUri && SCHEMES.test(g.launchUri)) await shell.openExternal(g.launchUri)
    else if (g.exe && /\.(lnk|url)$/i.test(g.exe)) { const err = await shell.openPath(g.exe); if (err) throw new Error(err) }
    else if (g.exe) {
      const p = spawn(g.exe, splitArgs(g.args), { cwd: g.workDir || dirname(g.exe), detached: true, stdio: 'ignore', windowsHide: false })
      await new Promise<void>((ok, ko) => { p.once('spawn', ok); p.once('error', ko) })
      child = p.pid
      p.unref()
    } else throw new Error('aucun moyen de lancer ce jeu')

    const now = Date.now()
    this.running = { gameId: g.id, start: now, tracked: false }
    g.lastPlayed = now
    this.ctx.store.save()
    emit(this.ctx.win(), 'session:state', { running: this.running })
    setTimeout(() => this.running?.gameId === g.id && this.toBack(), 1500)
    this.watch(g, now, child)
  }

  private watch(g: Game, launchedAt: number, childPid?: number): void {
    let empty = 0, seenAt = 0
    const tick = () => {
      const procs = findGameProcs(listProcesses(), { installDir: g.installDir, exe: g.exe, selfPid: process.pid })
      const alive = procs.length > 0 || (childPid !== undefined && isAlive(childPid))
      if (alive) {
        if (!seenAt) { seenAt = Date.now(); this.running = { gameId: g.id, start: seenAt, tracked: true }; emit(this.ctx.win(), 'session:state', { running: this.running }); L.info('processus trouvé', procs.map((p) => p.path)) }
        empty = 0
      } else if (seenAt) {
        if (++empty >= END_GRACE) return this.end(g, seenAt, Date.now() - POLL * (END_GRACE - 1))
      } else if (Date.now() - launchedAt > WAIT_START) {
        L.warn('processus du jeu introuvable, session non comptée', g.name)
        return this.end(g, 0, 0)
      }
      this.timer = setTimeout(tick, POLL)
    }
    this.timer = setTimeout(tick, POLL)
  }

  /* Arrêt du suivi demandé par l'utilisateur (jeu jamais détecté, ou retour forcé) */
  stop(): void {
    if (!this.running) return
    const g = this.ctx.store.games.get(this.running.gameId)
    if (this.timer) clearTimeout(this.timer)
    if (g) this.end(g, this.running.tracked ? this.running.start : 0, Date.now())
  }

  private end(g: Game, start: number, end: number): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const duration = start ? Math.max(0, Math.round((end - start) / 1000)) : 0
    if (duration > 0) {
      g.playtime += duration
      g.lastPlayed = end
      this.ctx.store.sessions.push({ gameId: g.id, start, end })
    }
    this.ctx.store.save()
    this.running = null
    L.info('fin de session', g.name, duration, 's')
    emit(this.ctx.win(), 'session:state', { running: null, last: { gameId: g.id, duration } })
    emit(this.ctx.win(), 'library:changed', this.ctx.store.list())
    this.toFront()
  }
}

function isAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true } catch { return false }
}
