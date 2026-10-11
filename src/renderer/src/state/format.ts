/* Mise en forme des durées et dates (pure, testée). */
import { translate } from '../i18n/i18n'
import type { Language } from '@shared/types'

export function playtime(sec: number, lang: Language): string {
  if (sec < 60) return translate(lang, 'time.never')
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60)
  return h ? translate(lang, 'time.hm', { h, m: String(m).padStart(2, '0') }) : translate(lang, 'time.m', { m })
}

export function ago(ts: number | undefined, lang: Language, now = Date.now()): string {
  if (!ts) return translate(lang, 'time.never')
  const d = Math.floor((now - ts) / 864e5)
  if (now - ts < 3600e3) return translate(lang, 'time.justNow')
  if (d < 1) return translate(lang, 'time.today')
  if (d < 2) return translate(lang, 'time.yesterday')
  if (d < 30) return translate(lang, 'time.days', { n: d })
  return new Date(ts).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const PLATFORM_LABEL: Record<string, string> = { steam: 'Steam', epic: 'Epic Games', gog: 'GOG', ubisoft: 'Ubisoft', ea: 'EA', folder: 'Dossier', manual: 'PC' }
