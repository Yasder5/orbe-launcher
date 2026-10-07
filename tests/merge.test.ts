import { describe, expect, it } from 'vitest'
import { mergeScan } from '../src/main/scanners/merge'
import type { Game } from '../src/shared/types'

const base = (o: Partial<Game>): Game => ({ id: '', platform: 'steam', platformId: '', name: '', installed: true, favorite: false, hidden: false, addedAt: 0, playtime: 0, collections: [], media: {}, ...o })

describe('mergeScan', () => {
  it('ajoute, met à jour et garde les données utilisateur', () => {
    const old = [base({ id: 'steam:1', platformId: '1', name: 'Vieux nom', favorite: true, playtime: 500, collections: ['c'] })]
    const { games, stats } = mergeScan(old, { ok: { steam: [{ platform: 'steam', platformId: '1', name: 'Nouveau', installDir: 'C:\\A' }, { platform: 'steam', platformId: '2', name: 'B' }] } }, 42)
    expect(stats).toMatchObject({ added: 1, updated: 1 })
    const a = games.find((g) => g.id === 'steam:1')!
    expect(a).toMatchObject({ name: 'Nouveau', favorite: true, playtime: 500, collections: ['c'], installDir: 'C:\\A' })
    expect(games.find((g) => g.id === 'steam:2')!.addedAt).toBe(42)
  })
  it('ne renomme pas un jeu renommé par l’utilisateur', () => {
    const { games } = mergeScan([base({ id: 'steam:1', platformId: '1', name: 'Mon nom', nameLocked: true })], { ok: { steam: [{ platform: 'steam', platformId: '1', name: 'Officiel' }] } })
    expect(games[0].name).toBe('Mon nom')
  })
  it('marque désinstallé, sans toucher aux scanners en échec', () => {
    const old = [base({ id: 'steam:1', platformId: '1' }), base({ id: 'epic:x', platform: 'epic', platformId: 'x' })]
    const { games, stats } = mergeScan(old, { ok: { steam: [] } })
    expect(stats.uninstalled).toBe(1)
    expect(games.find((g) => g.id === 'steam:1')!.installed).toBe(false)
    expect(games.find((g) => g.id === 'epic:x')!.installed).toBe(true)
  })
  it('dédoublonne et fusionne un ajout manuel dans le jeu détecté', () => {
    const old = [base({ id: 'manual:m', platform: 'manual', platformId: 'm', exe: 'D:\\GOG Games\\W3\\bin\\w3.exe', playtime: 100, favorite: true })]
    const { games, stats } = mergeScan(old, { ok: { gog: [{ platform: 'gog', platformId: '9', name: 'W3', installDir: 'D:\\GOG Games\\W3' }, { platform: 'gog', platformId: '9', name: 'W3' }] } })
    expect(games).toHaveLength(1)
    expect(stats.merged).toBe(1)
    expect(games[0]).toMatchObject({ id: 'gog:9', playtime: 100, favorite: true })
  })
})
