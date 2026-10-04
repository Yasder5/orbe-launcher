import { describe, expect, it } from 'vitest'
import { padActions, padKind, Repeater } from '../src/renderer/src/nav/input'
import { glyph } from '../src/renderer/src/nav/glyph-map'

const pad = (pressed: number[], axes = [0, 0]) => ({ buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), touched: false, value: 0 })), axes })

describe('entrées manette', () => {
  it('traduit boutons et stick', () => {
    expect([...padActions(pad([0, 13]))].sort()).toEqual(['accept', 'down'])
    expect([...padActions(pad([], [-0.9, 0.1]))]).toEqual(['left'])
    expect(padActions(pad([], [0.3, -0.3])).size).toBe(0) // zone morte
  })
  it('reconnaît les manettes PlayStation', () => {
    expect(padKind('054c-0ce6-Wireless Controller')).toBe('ps')
    expect(padKind('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)')).toBe('ps')
    expect(padKind('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBe('xbox')
  })
  it('affiche le bon bouton', () => {
    expect(glyph('accept', 'xbox')).toBe('A')
    expect(glyph('accept', 'ps')).toBe('✕')
    expect(glyph('back', 'ps')).toBe('○')
  })
})

describe('Repeater', () => {
  it('répète une direction tenue, pas un bouton', () => {
    const r = new Repeater()
    expect(r.step('down', true, 0)).toBe(true)
    expect(r.step('down', true, 200)).toBe(false)
    expect(r.step('down', true, 400)).toBe(true)
    expect(r.step('down', true, 430)).toBe(false)
    expect(r.step('down', true, 490)).toBe(true)
    expect(r.step('accept', true, 0)).toBe(true)
    expect(r.step('accept', true, 1000)).toBe(false)
    r.step('down', false, 500)
    expect(r.step('down', true, 510)).toBe(true)
  })
})
