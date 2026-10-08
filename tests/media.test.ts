import { describe, expect, it } from 'vitest'
import { allowedUrl, normName, SteamGridDB, steamCdn, steamInfo, steamSearch } from '../src/main/media/sources'

const json = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status })

describe('médias', () => {
  it("n'autorise que les CDN connus en https", () => {
    expect(allowedUrl('https://cdn2.steamgriddb.com/grid/abc.png')).toBe(true)
    expect(allowedUrl('http://cdn2.steamgriddb.com/grid/abc.png')).toBe(false)
    expect(allowedUrl('https://169.254.169.254/latest')).toBe(false)
    expect(allowedUrl('https://cdn2.steamgriddb.com.evil.io/x.png')).toBe(false)
    expect(allowedUrl('pas une url')).toBe(false)
  })
  it('normalise les noms', () => {
    expect(normName('ELDEN RING™')).toBe('elden ring')
    expect(normName('Pokémon : Édition')).toBe('pokemon edition')
  })
  it('donne des URL CDN Steam', () => {
    expect(steamCdn('620', 'cover')[0]).toContain('/620/library_600x900_2x.jpg')
    expect(steamCdn('620', 'icon')).toEqual([])
  })
  it('SteamGridDB : id par appid, sinon par nom exact', async () => {
    const calls: string[] = []
    const f = (async (u: string) => {
      calls.push(u)
      if (u.includes('/games/steam/')) return new Response('{}', { status: 404 })
      return new Response(JSON.stringify({ success: true, data: [{ id: 1, name: 'Hades II' }, { id: 2, name: 'Hades' }] }))
    }) as typeof fetch
    expect(await new SteamGridDB('k', f).gameId('Hades', '1145360')).toBe(2)
    expect(calls[0]).toContain('/games/steam/1145360')
  })
  it('SteamGridDB : clé refusée = erreur claire', async () => {
    await expect(new SteamGridDB('k', json({}, 401) as unknown as typeof fetch).gameId('x')).rejects.toThrow('refusée')
  })
  it('store Steam : infos nettoyées et recherche exacte', async () => {
    const info = await steamInfo('620', 'fr', json({ '620': { success: true, data: { short_description: 'Un <b>jeu</b> &amp; plus', genres: [{ description: 'Réflexion' }], release_date: { date: '18 avr. 2011' }, developers: ['Valve'] } } }) as unknown as typeof fetch)
    expect(info).toEqual({ description: 'Un jeu & plus', genres: ['Réflexion'], releaseDate: '18 avr. 2011', developer: 'Valve' })
    expect(await steamSearch('Portal 2', json({ items: [{ id: 999, name: 'Portal 2 Soundtrack' }, { id: 620, name: 'Portal 2' }] }) as unknown as typeof fetch)).toBe('620')
    expect(await steamSearch('Inconnu', json({ items: [{ id: 1, name: 'Autre' }] }) as unknown as typeof fetch)).toBeNull()
  })
})
