/* Traductions : FR par défaut, EN. Clés plates, variables {nom}. */
import { useCallback } from 'react'
import { useSettings } from '../state/settings'
import { en } from './en'
import { fr } from './fr'

export type Key = keyof typeof fr
export const dicts = { fr, en } satisfies Record<string, Record<Key, string>>

export function translate(lang: 'fr' | 'en', key: string, vars?: Record<string, string | number>): string {
  const s = (dicts[lang] as Record<string, string>)[key] ?? (fr as Record<string, string>)[key] ?? key
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : s
}

export function useT() {
  const { settings } = useSettings()
  return useCallback((key: string, vars?: Record<string, string | number>) => translate(settings.language, key, vars), [settings.language])
}
