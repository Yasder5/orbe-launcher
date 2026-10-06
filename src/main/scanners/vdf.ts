/* Parseur du format texte KeyValues de Valve (libraryfolders.vdf, appmanifest_*.acf). */
export type Vdf = { [k: string]: string | Vdf }

export function parseVdf(text: string): Vdf {
  let i = 0
  const n = text.length
  const skip = () => {
    for (;;) {
      while (i < n && /\s/.test(text[i])) i++
      if (text[i] === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; continue }
      return
    }
  }
  const str = (): string => {
    if (text[i] !== '"') { // jeton sans guillemets
      const s = i
      while (i < n && !/[\s{}"]/.test(text[i])) i++
      return text.slice(s, i)
    }
    i++
    let out = ''
    while (i < n && text[i] !== '"') {
      if (text[i] === '\\' && i + 1 < n) { const c = text[++i]; out += c === 'n' ? '\n' : c === 't' ? '\t' : c } else out += text[i]
      i++
    }
    i++
    return out
  }
  const obj = (): Vdf => {
    const o: Vdf = {}
    for (;;) {
      skip()
      if (i >= n || text[i] === '}') { i++; return o }
      const k = str()
      skip()
      if (text[i] === '{') { i++; o[k] = obj() } else o[k] = str()
    }
  }
  return obj()
}

/* Accès insensible à la casse (les clés varient : "AppState" / "appstate") */
export function get(o: Vdf | string | undefined, key: string): Vdf | string | undefined {
  if (!o || typeof o === 'string') return undefined
  const k = Object.keys(o).find((x) => x.toLowerCase() === key.toLowerCase())
  return k === undefined ? undefined : o[k]
}
