# Skin Steam Orbe

Le style d'Orbe Launcher pour l'interface manette de Steam (Big Picture sous Windows, mode jeu SteamOS / Steam Deck), via [CSS Loader](https://github.com/DeckThemes/SDH-CssLoader). Rien n'est modifié dans les fichiers de Steam.

- `Orbe/` : le thème CSS Loader (couleurs dans `shared.css`, options « Police Archivo » et « Fond orbe »).
- `deck_startup.webm` : vidéo de démarrage 1280×800 pour Steam Deck / SteamOS.
- `tools/check.py` : vérifie que chaque classe utilisée existe dans la version actuelle de Steam.
- `tools/art.html` + `tools/render.py` : rendent `Orbe/orb.webp` et les images de la vidéo.

## Installer

**Steam Deck / SteamOS** : Decky Loader, puis CSS Loader depuis sa boutique ; copier `Orbe/` dans `~/homebrew/themes/` et l'activer dans CSS Loader.

**Windows (Big Picture)** : [CSSLoader Desktop](https://github.com/beebls/CSSLoader-Desktop/releases) ; activer le mode développeur de Windows et redémarrer le backend une fois (police et fond) ; copier `Orbe/` dans `%USERPROFILE%\homebrew\themes\`.

**Vidéo de démarrage** : copier `deck_startup.webm` dans `~/.steam/root/config/uioverrides/movies/`, puis Paramètres, Personnalisation, Vidéo de démarrage.

## Classes Steam

Les sélecteurs utilisent les noms lisibles (`gamepaddialog_ToggleRail`) : CSS Loader les traduit vers les noms obfusqués de la version de Steam installée. Après une mise à jour de Steam :

```sh
curl -so map.json https://api.deckthemes.com/stable.json
# sp.css : dans le paquet steamui_websrc_all du client (liste : client-update.steamstatic.com/steam_client_ubuntu12)
python3 tools/check.py map.json sp.css
```
