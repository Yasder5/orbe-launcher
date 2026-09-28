import { describe, expect, it } from 'vitest'
import { gamePatch, InvalidInput, settingsPatch } from '../src/main/validate'

describe('validation IPC', () => {
  it('ignore les champs inconnus', () => {
    expect(settingsPatch({ volume: 0.5, evil: 1 })).toEqual({ volume: 0.5 })
  })
  it('refuse les mauvais types', () => {
    expect(() => settingsPatch({ volume: 3 })).toThrow(InvalidInput)
    expect(() => settingsPatch({ language: 'de' })).toThrow(InvalidInput)
    expect(() => gamePatch({ name: 'x'.repeat(500) })).toThrow(InvalidInput)
  })
  it('remplace un nom vide', () => {
    expect(gamePatch({ name: '  ' }).name).toBe('Sans nom')
  })
})
