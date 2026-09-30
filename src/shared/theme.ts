/* Format d'un thème (themes/<id>/theme.json) et validation. Pur : utilisé par le processus principal et les tests. */

export type LibraryLayout = 'grid' | 'carousel' | 'list'
export type SoundName = 'move' | 'select' | 'back' | 'error' | 'launch'
export const SOUND_NAMES: SoundName[] = ['move', 'select', 'back', 'error', 'launch']

export interface ThemeFont {
  family: string
  src: string // chemin relatif au dossier du thème
  weight?: string // "400" ou plage "100 900"
  style?: string
  unicodeRange?: string // ex. "U+0000-00FF" quand une police est découpée en plusieurs fichiers
}

export type ThemeBackground =
  | { type: 'none' }
  | { type: 'orb' } // orbe de particules animée (thème Orbe)
  | { type: 'image'; src: string }
  | { type: 'video'; src: string }

export interface ThemeSplash {
  type: 'orb' | 'logo' | 'image' | 'video' | 'none'
  src?: string
  duration: number // ms
}

export interface ThemeManifest {
  id: string
  name: string
  author?: string
  version?: string
  description?: string
  vars: Record<string, string> // variables CSS posées sur :root
  fonts: ThemeFont[]
  css?: string // feuille de style du thème (theme.css par défaut)
  layout: { library: LibraryLayout }
  background: ThemeBackground
  splash: ThemeSplash
  sounds: Partial<Record<SoundName, string>>
}

/* Variables que l'interface utilise : un thème qui en oublie hérite de celles d'Orbe */
export const REQUIRED_VARS = [
  '--bg', '--surface', '--surface-2', '--text', '--muted', '--line', '--accent', '--on-accent', '--danger',
  '--font-sans', '--font-mono',
  '--radius-s', '--radius-m', '--radius-l',
  '--shadow-card', '--focus-ring', '--focus-scale',
  '--dur-fast', '--dur-med', '--dur-slow', '--ease'
] as const

export interface ThemeCheck {
  theme: ThemeManifest | null
  errors: string[] // bloquant : thème refusé
  warnings: string[] // non bloquant : thème chargé avec des valeurs par défaut
}

const SAFE_PATH = /^(?!.*\.\.)[\w\-./ ]{1,200}$/ // chemin relatif sans remontée
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

export function validateTheme(raw: unknown, dirName: string): ThemeCheck {
  const errors: string[] = [], warnings: string[] = []
  if (!isObj(raw)) return { theme: null, errors: ['theme.json : objet attendu'], warnings }
  const id = typeof raw.id === 'string' ? raw.id : dirName
  if (!/^[a-z0-9-]{1,40}$/.test(id)) errors.push('id : minuscules, chiffres et tirets uniquement')
  if (id !== dirName) warnings.push(`id « ${id} » différent du dossier « ${dirName} », le dossier fait foi`)
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 60) : dirName

  const vars: Record<string, string> = {}
  if (isObj(raw.vars)) {
    for (const [k, v] of Object.entries(raw.vars)) {
      if (!/^--[a-z0-9-]{1,40}$/.test(k)) warnings.push(`variable ignorée : ${k}`)
      else if (typeof v !== 'string' || v.length > 300 || /[;{}<>]|url\(/i.test(v)) warnings.push(`valeur ignorée pour ${k}`)
      else vars[k] = v
    }
  } else warnings.push('vars absent : couleurs du thème Orbe utilisées')
  const missing = REQUIRED_VARS.filter((k) => !(k in vars))
  if (missing.length && isObj(raw.vars)) warnings.push('variables manquantes (valeurs Orbe) : ' + missing.join(', '))

  const path = (v: unknown, what: string): string | undefined => {
    if (v === undefined) return undefined
    if (typeof v === 'string' && SAFE_PATH.test(v)) return v
    errors.push(`${what} : chemin relatif invalide`)
    return undefined
  }

  const fonts: ThemeFont[] = []
  if (Array.isArray(raw.fonts)) {
    for (const f of raw.fonts) {
      if (!isObj(f) || typeof f.family !== 'string' || !/^[\w\- ]{1,60}$/.test(f.family)) { warnings.push('police ignorée (family invalide)'); continue }
      const src = path(f.src, 'police ' + f.family)
      if (src) fonts.push({ family: f.family, src, weight: typeof f.weight === 'string' && /^\d{3}( \d{3})?$/.test(f.weight) ? f.weight : undefined, style: f.style === 'italic' ? 'italic' : undefined, unicodeRange: typeof f.unicodeRange === 'string' && /^[U+0-9A-Fa-f?, -]{1,400}$/.test(f.unicodeRange) ? f.unicodeRange : undefined })
    }
  }

  const layoutRaw = isObj(raw.layout) ? raw.layout.library : undefined
  const library: LibraryLayout = layoutRaw === 'carousel' || layoutRaw === 'list' ? layoutRaw : 'grid'
  if (layoutRaw !== undefined && layoutRaw !== library) warnings.push('layout.library inconnu, grille utilisée')

  let background: ThemeBackground = { type: 'none' }
  if (isObj(raw.background)) {
    const t = raw.background.type
    if (t === 'orb') background = { type: 'orb' }
    else if (t === 'image' || t === 'video') {
      const src = path(raw.background.src, 'fond')
      if (src) background = { type: t, src }
    } else if (t !== 'none') warnings.push('fond inconnu, aucun fond')
  }

  let splash: ThemeSplash = { type: 'logo', duration: 1200 }
  if (isObj(raw.splash)) {
    const t = raw.splash.type
    const type = t === 'orb' || t === 'image' || t === 'video' || t === 'none' || t === 'logo' ? t : 'logo'
    const d = typeof raw.splash.duration === 'number' ? Math.min(Math.max(raw.splash.duration, 0), 6000) : 1200
    splash = { type, duration: d, src: type === 'image' || type === 'video' ? path(raw.splash.src, 'écran de démarrage') : undefined }
    if ((type === 'image' || type === 'video') && !splash.src) splash = { type: 'logo', duration: d }
  }

  const sounds: ThemeManifest['sounds'] = {}
  if (isObj(raw.sounds)) for (const n of SOUND_NAMES) { const s = path(raw.sounds[n], 'son ' + n); if (s) sounds[n] = s }

  const css = raw.css === undefined ? 'theme.css' : path(raw.css, 'css')
  const meta = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string).slice(0, 200) : undefined)

  if (errors.length) return { theme: null, errors, warnings }
  return {
    theme: { id: dirName, name, author: meta('author'), version: meta('version'), description: meta('description'), vars, fonts, css, layout: { library }, background, splash, sounds },
    errors,
    warnings
  }
}

/* Résout un chemin demandé dans un thème ; null si on sort du dossier */
export function safeJoin(root: string, rel: string, sep = '/'): string | null {
  const parts: string[] = []
  for (const p of decodeURIComponent(rel).split(/[\\/]+/)) {
    if (!p || p === '.') continue
    if (p === '..' || p.includes(':')) return null
    parts.push(p)
  }
  return parts.length ? root.replace(/[\\/]+$/, '') + sep + parts.join(sep) : null
}
