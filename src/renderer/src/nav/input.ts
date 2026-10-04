/* Entrées : manette (Gamepad API), clavier, souris, ramenées à des actions. Répétition quand une direction est tenue. */

export type Action = 'up' | 'down' | 'left' | 'right' | 'accept' | 'back' | 'x' | 'y' | 'lb' | 'rb' | 'lt' | 'rt' | 'menu' | 'view'
export type InputKind = 'xbox' | 'ps' | 'keyboard' | 'mouse'

const REPEAT_DELAY = 380, REPEAT_RATE = 80 // ms
const DIRS: Action[] = ['up', 'down', 'left', 'right']

/* Boutons de la disposition standard (W3C) */
const BUTTONS: [number, Action][] = [
  [0, 'accept'], [1, 'back'], [2, 'x'], [3, 'y'], [4, 'lb'], [5, 'rb'], [6, 'lt'], [7, 'rt'], [8, 'view'], [9, 'menu'],
  [12, 'up'], [13, 'down'], [14, 'left'], [15, 'right']
]

const KEYS: Record<string, Action> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Enter: 'accept', ' ': 'accept', Escape: 'back', Backspace: 'back',
  KeyX: 'x', KeyY: 'y', KeyQ: 'lb', KeyE: 'rb', PageUp: 'lt', PageDown: 'rt', F1: 'menu', Tab: 'view'
}

export function padKind(id: string): InputKind {
  return /054c|playstation|dualsense|dualshock|wireless controller/i.test(id) ? 'ps' : 'xbox'
}

/* Gestion de la répétition pour un bouton tenu ; renvoie true si l'action doit partir à cet instant */
export class Repeater {
  private since = new Map<Action, number>()
  private last = new Map<Action, number>()
  step(a: Action, down: boolean, now: number): boolean {
    if (!down) { this.since.delete(a); return false }
    const s = this.since.get(a)
    if (s === undefined) { this.since.set(a, now); this.last.set(a, now); return true }
    if (!DIRS.includes(a)) return false // seules les directions se répètent
    if (now - s >= REPEAT_DELAY && now - (this.last.get(a) ?? 0) >= REPEAT_RATE) { this.last.set(a, now); return true }
    return false
  }
}

/* Lecture des états d'une manette en actions enfoncées */
export function padActions(gp: Pick<Gamepad, 'buttons' | 'axes'>, dead = 0.5): Set<Action> {
  const on = new Set<Action>()
  for (const [i, a] of BUTTONS) if (gp.buttons[i]?.pressed) on.add(a)
  const [x = 0, y = 0] = gp.axes
  if (x < -dead) on.add('left')
  if (x > dead) on.add('right')
  if (y < -dead) on.add('up')
  if (y > dead) on.add('down')
  return on
}

export interface InputHandlers {
  action: (a: Action) => void
  kind: (k: InputKind) => void
  guideHeld?: () => void
}

/* Démarre l'écoute ; renvoie une fonction d'arrêt */
export function startInput(h: InputHandlers): () => void {
  const rep = new Repeater()
  let raf = 0, kind: InputKind | null = null, guideSince = 0
  const setKind = (k: InputKind) => { if (k !== kind) { kind = k; h.kind(k) } }

  const loop = () => {
    raf = requestAnimationFrame(loop)
    if (!document.hasFocus()) return
    const now = performance.now()
    const pads = navigator.getGamepads?.() ?? []
    const on = new Set<Action>()
    let guide = false
    for (const gp of pads) {
      if (!gp || !gp.connected) continue
      const acts = padActions(gp)
      if (acts.size) setKind(padKind(gp.id))
      acts.forEach((a) => on.add(a))
      if (gp.buttons[16]?.pressed) guide = true
    }
    for (const [, a] of BUTTONS) if (rep.step(a, on.has(a), now)) h.action(a)
    // bouton Guide / PS tenu 0,8 s (quand Chromium le remonte ; sinon le processus principal s'en charge via XInput)
    if (guide) { if (!guideSince) guideSince = now; else if (now - guideSince > 800) { guideSince = Infinity; h.guideHeld?.() } } else guideSince = 0
  }
  raf = requestAnimationFrame(loop)

  const onKey = (e: KeyboardEvent) => {
    const a = KEYS[e.key] ?? KEYS[e.code]
    const t = e.target as HTMLElement
    if (t?.tagName === 'INPUT' && !['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab'].includes(e.key)) return // saisie au clavier physique
    if (!a) return
    e.preventDefault()
    setKind('keyboard')
    h.action(a) // le clavier répète déjà tout seul
  }
  const onMouse = () => setKind('mouse')
  addEventListener('keydown', onKey)
  addEventListener('mousemove', onMouse)
  return () => { cancelAnimationFrame(raf); removeEventListener('keydown', onKey); removeEventListener('mousemove', onMouse) }
}

export function rumble(): void {
  for (const gp of navigator.getGamepads?.() ?? []) {
    const act = (gp as Gamepad & { vibrationActuator?: { playEffect: (t: string, p: object) => Promise<unknown> } })?.vibrationActuator
    act?.playEffect('dual-rumble', { duration: 35, weakMagnitude: 0.25, strongMagnitude: 0 }).catch(() => {})
  }
}
