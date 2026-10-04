/* Gestionnaire de navigation : focus spatial dans la portée active (écran ou fenêtre modale), actions manette/clavier, sons. */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { SoundName } from '@shared/theme'
import { useSettings } from '../state/settings'
import { startInput, rumble, type Action, type InputKind } from './input'
import { play } from './sounds'
import { pickNext, type Dir } from './spatial'

type Handler = (a: Action) => boolean | void // true = action consommée

interface Ctx {
  kind: InputKind
  focus: (el: Element | null) => void
  push: (h: { current: Handler }) => () => void
  sound: (s: SoundName) => void
  current: () => HTMLElement | null
}

const NavCtx = createContext<Ctx>(null!)
const SEL = '[data-nav]:not([disabled])'

/* Portée active : la dernière fenêtre modale ouverte, sinon tout le document */
const scope = (): ParentNode => {
  const s = document.querySelectorAll('[data-nav-scope]')
  return s.length ? s[s.length - 1] : document
}
const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }

export function NavProvider({ children, onGuide }: { children: ReactNode; onGuide?: () => void }) {
  const [kind, setKind] = useState<InputKind>('mouse')
  const cur = useRef<HTMLElement | null>(null)
  const stack = useRef<{ current: Handler }[]>([])
  const { settings } = useSettings()
  const vib = useRef(settings.vibration)
  vib.current = settings.vibration

  const focus = useCallback((el: Element | null) => {
    if (!(el instanceof HTMLElement) || el === cur.current) return
    cur.current?.classList.remove('is-focused')
    cur.current = el
    el.classList.add('is-focused')
    el.focus({ preventScroll: true })
    el.scrollIntoView({ block: el.dataset.navScroll === 'center' ? 'center' : 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [])

  /* Remet le focus sur un élément valide (écran changé, élément supprimé, fenêtre fermée) */
  const refocus = useCallback(() => {
    const sc = scope(), c = cur.current
    if (c && c.isConnected && (sc === document || (sc as Element).contains(c)) && visible(c)) return
    const auto = sc.querySelector<HTMLElement>('[data-nav-autofocus]' ) ?? [...sc.querySelectorAll<HTMLElement>(SEL)].find(visible) ?? null
    if (c && !c.isConnected) cur.current = null
    if (auto) focus(auto)
  }, [focus])

  const move = useCallback((dir: Dir) => {
    const sc = scope(), from = cur.current
    const els = [...sc.querySelectorAll<HTMLElement>(SEL)].filter(visible)
    if (!from || !from.isConnected) { if (els[0]) focus(els[0]); return }
    // un groupe (data-nav-group) garde le focus dans sa ligne pour gauche/droite
    const r = from.getBoundingClientRect(), box = { x: r.left, y: r.top, w: r.width, h: r.height }
    const next = pickNext(box, els.filter((e) => e !== from).map((el) => { const b = el.getBoundingClientRect(); return { el, box: { x: b.left, y: b.top, w: b.width, h: b.height } } }), dir)
    if (next) { focus(next.el); play('move'); if (vib.current) rumble() }
  }, [focus])

  useEffect(() => {
    const stop = startInput({
      kind: (k) => { setKind(k); document.documentElement.dataset.input = k === 'mouse' ? 'mouse' : k === 'keyboard' ? 'keyboard' : 'pad' },
      action: (a) => {
        for (let i = stack.current.length - 1; i >= 0; i--) if (stack.current[i].current(a)) return
        if (a === 'up' || a === 'down' || a === 'left' || a === 'right') move(a)
        else if (a === 'accept' && cur.current) { play('select'); cur.current.click() }
      },
      guideHeld: onGuide
    })
    const over = (e: PointerEvent) => { const t = (e.target as Element).closest?.(SEL); if (t) focus(t) }
    const mo = new MutationObserver(() => requestAnimationFrame(refocus))
    mo.observe(document.body, { childList: true, subtree: true })
    addEventListener('pointerover', over)
    return () => { stop(); mo.disconnect(); removeEventListener('pointerover', over) }
  }, [move, focus, refocus, onGuide])

  const push = useCallback((h: { current: Handler }) => { stack.current.push(h); return () => { stack.current = stack.current.filter((x) => x !== h) } }, [])
  return <NavCtx.Provider value={{ kind, focus, push, sound: play, current: () => cur.current }}>{children}</NavCtx.Provider>
}

export const useNavCtx = () => useContext(NavCtx)

/* Intercepte les actions tant que le composant est affiché (le plus récent passe en premier) */
export function useNav(handler: Handler, active = true): void {
  const { push } = useNavCtx()
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => (active ? push(ref) : undefined), [push, active])
}
