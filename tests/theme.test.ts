import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REQUIRED_VARS, safeJoin, validateTheme } from '../src/shared/theme'

const themesDir = join(__dirname, '..', 'themes')

describe('validateTheme', () => {
  it('valide les thèmes livrés sans avertissement et avec toutes les variables', () => {
    for (const id of readdirSync(themesDir)) {
      const c = validateTheme(JSON.parse(readFileSync(join(themesDir, id, 'theme.json'), 'utf8')), id)
      expect(c.errors, id).toEqual([])
      expect(c.warnings, id).toEqual([])
      for (const v of REQUIRED_VARS) expect(c.theme!.vars[v], `${id} ${v}`).toBeTruthy()
    }
  })

  it('applique des valeurs par défaut sûres', () => {
    const c = validateTheme({ name: 'X', layout: { library: 'spirale' }, splash: { type: 'video' } }, 'x')
    expect(c.theme!.layout.library).toBe('grid')
    expect(c.theme!.splash.type).toBe('logo')
    expect(c.theme!.css).toBe('theme.css')
    expect(c.warnings.length).toBeGreaterThan(0)
  })

  it('refuse les chemins qui sortent du dossier', () => {
    expect(validateTheme({ background: { type: 'image', src: '../../secret.png' } }, 'x').theme).toBeNull()
    expect(validateTheme({ sounds: { move: 'C:/Windows/x.wav' } }, 'x').theme).toBeNull()
  })

  it('ignore les variables dangereuses', () => {
    const c = validateTheme({ vars: { '--bg': 'red; } body { display:none', '--ok': '#fff', bad: '1', '--img': 'url(http://x)' } }, 'x')
    expect(c.theme!.vars).toEqual({ '--ok': '#fff' })
  })

  it('refuse un id invalide', () => {
    expect(validateTheme({}, 'Mon Thème').theme).toBeNull()
  })
})

describe('safeJoin', () => {
  it('reste dans le dossier', () => {
    expect(safeJoin('/t/orbe', '/fonts/a.woff2')).toBe('/t/orbe/fonts/a.woff2')
    expect(safeJoin('/t/orbe', '/../x')).toBeNull()
    expect(safeJoin('/t/orbe', '/%2e%2e/x')).toBeNull()
    expect(safeJoin('C:\\t\\orbe', '/a/b.css', '\\')).toBe('C:\\t\\orbe\\a\\b.css')
    expect(safeJoin('/t/orbe', '/c:/x')).toBeNull()
    expect(safeJoin('/t/orbe', '/')).toBeNull()
  })
})
