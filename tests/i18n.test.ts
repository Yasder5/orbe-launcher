import { describe, expect, it } from 'vitest'
import { en } from '../src/renderer/src/i18n/en'
import { fr } from '../src/renderer/src/i18n/fr'

describe('traductions', () => {
  it('même clés et mêmes variables en FR et EN', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
    for (const [k, v] of Object.entries(fr)) {
      const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()
      expect(vars(en[k as keyof typeof en]), k).toEqual(vars(v))
    }
  })
})
