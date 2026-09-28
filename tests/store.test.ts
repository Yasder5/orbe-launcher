import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Store } from '../src/main/store'
import { DEFAULT_SETTINGS } from '../src/shared/types'

const tmp = () => mkdtempSync(join(tmpdir(), 'orbe-'))

describe('Store', () => {
  it('part des réglages par défaut et sauvegarde', () => {
    const d = tmp(), s = new Store(d)
    expect(s.settings).toEqual(DEFAULT_SETTINGS)
    s.settings.volume = 0.2
    s.flush()
    expect(JSON.parse(readFileSync(join(d, 'settings.json'), 'utf8')).volume).toBe(0.2)
    expect(new Store(d).settings.volume).toBe(0.2)
  })

  it('met de côté un fichier abîmé sans planter', () => {
    const d = tmp()
    writeFileSync(join(d, 'library.json'), '{pas du json')
    const s = new Store(d)
    expect(s.list()).toEqual([])
    expect(readdirSync(d).some((f) => f.startsWith('library.json.bad-'))).toBe(true)
  })

  it('complète les scanners manquants', () => {
    const d = tmp()
    writeFileSync(join(d, 'settings.json'), JSON.stringify({ scanners: { steam: false } }))
    expect(new Store(d).settings.scanners).toEqual({ ...DEFAULT_SETTINGS.scanners, steam: false })
  })
})
