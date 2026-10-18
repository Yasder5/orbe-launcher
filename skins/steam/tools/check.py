#!/usr/bin/env python3
"""Vérifie que chaque classe lisible du skin (module_Nom) est connue de CSS Loader et existe dans l'interface Steam actuelle.
Usage : check.py <map.json de api.deckthemes.com/stable.json> <sp.css du paquet steamui_websrc_all>"""
import json, re, sys
from pathlib import Path

mapping, sp = json.load(open(sys.argv[1])), open(sys.argv[2]).read()
alias = {a: v[-1] for v in mapping.values() for a in v}
bad = 0
for f in sorted((Path(__file__).parent.parent / "Orbe").glob("*.css")):
    for name in sorted(set(re.findall(r"\.([a-z]+_[A-Za-z]+)\b", f.read_text()))):
        cur = alias.get(name)
        ok = cur is not None and re.search(r"\." + re.escape(cur) + r"(?![\w-])", sp)
        bad += not ok
        print("%-4s %-12s %-45s %s" % ("ok" if ok else "ABS", f.name, name, cur or "-"))
sys.exit(1 if bad else 0)
