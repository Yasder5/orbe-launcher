/* Fenêtres modales : menu d'options et confirmation. Retour (B) ferme. */
import type { ReactNode } from 'react'
import { HintBar } from '../nav/glyphs'
import { useNav } from '../nav/nav'
import { play } from '../nav/sounds'

export function Modal({ title, kicker, children, onClose, wide }: { title?: string; kicker?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useNav((a) => { if (a === 'back') { play('back'); onClose(); return true } return false }, true, 2)
  return (
    <div className="modal" data-nav-scope role="dialog" aria-label={title}>
      <div className={'modal__box' + (wide ? ' modal__box--wide' : '')}>
        {kicker && <p className="kicker">{kicker}</p>}
        {title && <h2 className="title modal__title">{title}</h2>}
        {children}
      </div>
      <HintBar items={[['accept', 'hint.select'], ['back', 'hint.back']]} />
    </div>
  )
}

export interface MenuItem { label: string; onSelect: () => void; danger?: boolean; checked?: boolean; hint?: string }

export function Menu({ title, kicker, items, onClose }: { title?: string; kicker?: string; items: MenuItem[]; onClose: () => void }) {
  return (
    <Modal title={title} kicker={kicker} onClose={onClose}>
      <div className="menu">
        {items.map((it, i) => (
          <button key={it.label} className={'menu__item' + (it.danger ? ' menu__item--danger' : '')} data-nav {...(i === 0 ? { 'data-nav-autofocus': true } : {})} onClick={it.onSelect}>
            {it.checked !== undefined && <span className="menu__check">{it.checked ? '■' : '□'}</span>}
            <span>{it.label}</span>
            {it.hint && <span className="menu__hint mono">{it.hint}</span>}
          </button>
        ))}
      </div>
    </Modal>
  )
}

export function Confirm({ title, text, ok, cancel, danger, onOk, onClose }: { title: string; text?: string; ok: string; cancel: string; danger?: boolean; onOk: () => void; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      {text && <p className="muted">{text}</p>}
      <div className="actions">
        <button className="btn" data-nav data-nav-autofocus onClick={onClose}>{cancel}</button>
        <button className={'btn ' + (danger ? 'btn--danger' : 'btn--primary')} data-nav onClick={onOk}>{ok}</button>
      </div>
    </Modal>
  )
}
