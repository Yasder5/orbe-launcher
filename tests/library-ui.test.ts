import { describe, expect, it } from 'vitest'
import { filterGames } from '../src/renderer/src/screens/filter'
import type { Game } from '../src/shared/types'

const g = (name: string, o: Partial<Game> = {}): Game => ({ id: name, platform: 'steam', platformId: name, name, installed: true, favorite: false, hidden: false, addedAt: 0, playtime: 0, collections: [], media: {}, ...o })
const games = [g('The Witcher 3: Wild Hunt', { platform: 'gog', playtime: 50 }), g('Hades', { favorite: true, lastPlayed: 10, addedAt: 5 }), g('Pokémon Légendes', { installed: false, playtime: 90 }), g('Celeste', { lastPlayed: 20 })]
const names = (o: Parameters<typeof filterGames>[1]) => filterGames(games, o).map((x) => x.name)

describe('filtres de la bibliothèque', () => {
  it('cherche par mots, sans accents ni casse', () => {
    expect(names({ filter: 'all', sort: 'name', query: 'witcher 3' })).toEqual(['The Witcher 3: Wild Hunt'])
    expect(names({ filter: 'all', sort: 'name', query: 'pokemon legendes' })).toEqual(['Pokémon Légendes'])
  })
  it('filtre installés, favoris, plateforme', () => {
    expect(names({ filter: 'installed', sort: 'name', query: '' })).not.toContain('Pokémon Légendes')
    expect(names({ filter: 'favorites', sort: 'name', query: '' })).toEqual(['Hades'])
    expect(names({ filter: 'gog', sort: 'name', query: '' })).toEqual(['The Witcher 3: Wild Hunt'])
  })
  it('trie', () => {
    expect(names({ filter: 'all', sort: 'name', query: '' })).toEqual(['Celeste', 'Hades', 'Pokémon Légendes', 'The Witcher 3: Wild Hunt'])
    expect(names({ filter: 'all', sort: 'playtime', query: '' })[0]).toBe('Pokémon Légendes')
    expect(names({ filter: 'all', sort: 'recent', query: '' }).slice(0, 2)).toEqual(['Celeste', 'Hades'])
  })
})
