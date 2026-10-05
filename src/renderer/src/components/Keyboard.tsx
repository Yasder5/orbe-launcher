/* Clavier virtuel plein écran pour la manette. Le clavier physique tape aussi dedans. */
import { useEffect, useRef, useState } from 'react'
import { HintBar } from '../nav/glyphs'
import { useNav } from '../nav/nav'
import { useSettings } from '../state/settings'
import { useT } from '../i18n/i18n'

const LAYOUTS = {
  fr: ['1234567890', 'azertyuiop', 'qsdfghjklm', "wxcvbn,.'-"],
  en: ['1234567890', 'qwertyuiop', 'asdfghjkl-', "zxcvbnm,.'"]
}

interface Props {
  title?: string
  value: string
  max?: number
  onChange?: (v: string) => void // à chaque frappe (recherche instantanée)
  onSubmit: (v: string) => void
  onCancel: () => void
}

export function Keyboard({ title, value: initial, max = 120, onChange, onSubmit, onCancel }: Props) {
  const t = useT()
  const { settings } = useSettings()
  const [value, setValue] = useState(initial)
  const [shift, setShift] = useState(false)
  const first = useRef(true)
  const type = (c: string) => setValue((v) => (v + c).slice(0, max))
  const typeKey = (c: string) => type(shift ? c.toUpperCase() : c)
  const del = () => setValue((v) => v.slice(0, -1))
  useEffect(() => { if (first.current) first.current = false; else onChange?.(value) }, [value])

  /* Clavier physique : caractères et retour arrière vont dans le champ, avant la navigation */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key.length === 1) type(e.key)
      else if (e.key === 'Backspace') del()
      else if (e.key === 'Enter' && !(document.activeElement instanceof HTMLButtonElement)) onSubmit(value)
      else return
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    addEventListener('keydown', k, true)
    return () => removeEventListener('keydown', k, true)
  })

  useNav((a) => {
    if (a === 'back') { onCancel(); return true }
    if (a === 'x') { del(); return true }
    if (a === 'y') { type(' '); return true }
    if (a === 'lb' || a === 'lt') { setShift((s) => !s); return true }
    if (a === 'menu' || a === 'rt') { onSubmit(value); return true }
    return false
  })

  return (
    <div className="modal osk" data-nav-scope role="dialog" aria-label={title ?? t('kb.title')}>
      <div className="osk__box">
        <p className="kicker">{title ?? t('kb.title')}</p>
        <div className="osk__field" aria-live="polite">{value}<span className="osk__caret" /></div>
        <div className="osk__keys">
          {LAYOUTS[settings.language].map((row, i) => (
            <div className="osk__row" key={i}>
              {[...row].map((c, j) => (
                <button key={c} className="osk__key" data-nav {...(i === 1 && j === 0 ? { 'data-nav-autofocus': true } : {})} onClick={() => typeKey(c)}>
                  {shift ? c.toUpperCase() : c}
                </button>
              ))}
            </div>
          ))}
          <div className="osk__row">
            <button className={'osk__key osk__key--wide' + (shift ? ' is-on' : '')} data-nav onClick={() => setShift((s) => !s)}>⇧</button>
            <button className="osk__key osk__key--space" data-nav onClick={() => type(' ')}>{t('kb.space')}</button>
            <button className="osk__key osk__key--wide" data-nav onClick={del}>⌫</button>
            <button className="osk__key osk__key--ok" data-nav onClick={() => onSubmit(value)}>{t('kb.ok')}</button>
          </div>
        </div>
      </div>
      <HintBar items={[['accept', 'hint.select'], ['x', 'hint.delete'], ['y', 'hint.space'], ['lb', 'hint.shift'], ['menu', 'hint.ok'], ['back', 'hint.back']]} />
    </div>
  )
}
