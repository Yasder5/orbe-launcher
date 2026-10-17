# Orbe Launcher

Launcher de jeux PC plein écran pour Windows 10 et 11, pensé pour la manette, dans l'esprit de Steam Big Picture. Il regroupe les jeux Steam, Epic Games, GOG, Ubisoft Connect, EA app et ceux que vous ajoutez vous-même, récupère les jaquettes, compte le temps de jeu et se pilote entièrement à la manette.

Thème par défaut : **Orbe** (noir profond, accent lime, Archivo et JetBrains Mono, orbe de particules). Tout le design passe par des thèmes interchangeables à chaud.

## Fonctionnalités

- **Bibliothèque automatique** : Steam (registre, `libraryfolders.vdf`, `appmanifest_*.acf`), Epic Games (manifestes `.item`), GOG Galaxy (registre), Ubisoft Connect (registre), EA app (registre + `installerdata.xml`), dossiers de jeux choisis dans les paramètres (un sous-dossier = un jeu). Rescan à la demande, détection des jeux désinstallés, fusion des doublons, ajout manuel (exe, arguments, dossier de travail, jaquette).
- **Jaquettes et médias** : SteamGridDB (jaquette, fond, logo, icône) avec votre clé API, sinon CDN Steam, sinon une jaquette générée au style du thème. Cache local, choix manuel parmi les résultats ou depuis un fichier. Description, genres, date de sortie et studio depuis le store Steam.
- **Navigation manette** : Xbox et PlayStation (Gamepad API), clavier et souris en secours. Focus spatial dans toute l'interface, répétition quand une direction est tenue, boutons affichés selon la manette (A / B ou Croix / Rond), sons de navigation, vibration légère, clavier virtuel AZERTY / QWERTY.
- **Écrans** : accueil (derniers lancés, favoris, ajoutés récemment), bibliothèque (filtres, tri, recherche instantanée, grille virtualisée), collections, fiche jeu (fond, logo, temps de jeu, dernière session, Jouer, favori, modifier, images), paramètres, menu système (quitter, veille, redémarrer, éteindre, toujours avec confirmation).
- **Lancement et suivi** : le launcher passe en arrière-plan et met ses animations en pause, retrouve le vrai processus du jeu (même lancé par Steam ou Epic), compte le temps de jeu par session et revient au premier plan à la fermeture du jeu. Bouton Guide (ou Back + Start) tenu : retour au launcher.
- **Système** : plein écran au démarrage, mode kiosque, lancement avec Windows, écran de démarrage animé, FR / EN, logs dans `%APPDATA%\OrbeLauncher\logs`.

## Installation

Téléchargez la dernière version dans les [Releases](https://github.com/Yasder5/orbe-launcher/releases) :

- `Orbe Launcher-Setup-x.y.z.exe` : installeur (choix du dossier, raccourcis bureau et menu Démarrer) ;
- `Orbe Launcher-Portable-x.y.z.exe` : version portable, sans installation.

Chaque commit sur `main` produit aussi ces deux fichiers dans les artefacts de la CI (onglet *Actions*).

> Tant que l'exécutable n'est pas signé par un certificat reconnu, Windows SmartScreen affiche « Windows a protégé votre ordinateur » : *Informations complémentaires*, puis *Exécuter quand même*. Voir [Signature](#signature-du-code).

## Commandes manette

| Manette | Clavier | Action |
| --- | --- | --- |
| Croix directionnelle, stick gauche | Flèches | Se déplacer |
| A / Croix | Entrée | Choisir |
| B / Rond | Échap, Retour arrière | Retour |
| X / Carré | X | Rechercher (bibliothèque), options (fiche jeu) |
| Y / Triangle | Y | Trier (bibliothèque), favori (fiche jeu) |
| LB / RB | Q / E | Onglet précédent / suivant |
| Menu / Options | F1 | Menu système |
| Guide tenu, ou Back + Start tenus | | Revenir au launcher pendant un jeu |

## Développement

Prérequis : Node.js 22, Windows pour lancer l'appli (le scan, le suivi des processus et XInput sont propres à Windows ; l'interface tourne aussi sous Linux pour le développement).

```bash
npm install
npm run dev        # appli en mode développement, rechargement à chaud
npm test           # tests Vitest (parseurs, scanners, fusion, thèmes, navigation, filtres)
npm run typecheck  # TypeScript strict
npm run dist       # build Windows : installeur NSIS + portable dans dist/
```

### Architecture

```
src/
  shared/      types et contrat IPC, validation des thèmes (partagés main / interface)
  main/        processus principal Electron
    scanners/  un module par plateforme derrière une interface commune (Scanner) + fusion
    media/     SteamGridDB, CDN Steam, store Steam, cache disque (protocole orbe-media://)
    launch/    lancement, reconnaissance du processus du jeu, sessions
    win/       Win32 via koffi (processus, XInput), veille / extinction
    themes.ts  chargement, protocole orbe-theme://, surveillance des fichiers
    store.ts   stockage JSON atomique (%APPDATA%\OrbeLauncher)
  preload/     pont contextBridge : seulement les canaux du contrat
  renderer/    interface React
    nav/       focus spatial, entrées manette / clavier, glyphes, sons
    screens/   écrans ; components/ ; state/ ; i18n/ ; theme/
themes/orbe/   thème par défaut
tools/         génération des sons du thème
tests/         tests Vitest
```

Sécurité : `contextIsolation`, `sandbox`, pas de `nodeIntegration`, IPC typé et validé côté principal, appels refusés s'ils ne viennent pas de la page de l'appli, CSP stricte, téléchargements d'images limités aux CDN SteamGridDB et Steam, clé API chiffrée sur le disque (DPAPI) et jamais renvoyée en clair à l'interface.

### Ajouter un scanner

Créez `src/main/scanners/maplateforme.ts` qui exporte un `Scanner` (`id`, `name`, `scan(env)`), puis ajoutez-le à `ALL_SCANNERS` dans `src/main/scanners/index.ts` et l'identifiant à `SCANNERS` dans `src/shared/types.ts`. `scan` reçoit un environnement injectable (registre, fichiers) : testez-le avec un faux disque comme dans `tests/scanners.test.ts`. Un scanner qui lève une erreur ou dépasse 30 s est ignoré sans toucher aux jeux qu'il avait trouvés avant.

## Données et configuration

Tout est dans `%APPDATA%\OrbeLauncher` :

| Fichier | Contenu |
| --- | --- |
| `settings.json` | paramètres (la clé SteamGridDB y est chiffrée) |
| `library.json` | jeux, collections |
| `sessions.json` | historique des sessions de jeu |
| `media/` | cache des images |
| `themes/` | vos thèmes |
| `logs/` | journaux, 14 jours |

Clé SteamGridDB : créez un compte sur [steamgriddb.com](https://www.steamgriddb.com), *Préférences*, *API*, puis collez la clé dans *Paramètres*, *Clé API SteamGridDB*.

## Créer un thème

Un thème est un dossier dans `%APPDATA%\OrbeLauncher\themes\<id>` (ou `themes/` du projet). Il apparaît dans *Paramètres*, *Thème*, et s'applique sans redémarrage. Quand un fichier du thème est modifié, il est rechargé tout seul (thèmes utilisateur toujours, thèmes livrés en mode développement).

```
themes/mon-theme/
  theme.json      métadonnées et variables
  theme.css       styles propres au thème (facultatif)
  fonts/ sounds/ … vos fichiers
```

`theme.json` :

```json
{
  "id": "mon-theme",
  "name": "Mon thème",
  "author": "Moi",
  "version": "1.0.0",
  "vars": {
    "--bg": "#101418", "--surface": "#171c22", "--surface-2": "#1f262e",
    "--text": "#eef2f5", "--muted": "#8a96a3", "--line": "#2a323b",
    "--accent": "#4cc2ff", "--on-accent": "#04121c", "--danger": "#ff5c5c",
    "--font-sans": "Inter, system-ui, sans-serif", "--font-mono": "ui-monospace, monospace",
    "--radius-s": "8px", "--radius-m": "12px", "--radius-l": "18px",
    "--shadow-card": "0 16px 40px rgba(0,0,0,.5)",
    "--focus-ring": "0 0 0 3px #4cc2ff", "--focus-scale": "1.05",
    "--dur-fast": "140ms", "--dur-med": "260ms", "--dur-slow": "500ms", "--ease": "cubic-bezier(.2,.8,.2,1)"
  },
  "fonts": [{ "family": "Inter", "src": "fonts/Inter.woff2", "weight": "100 900" }],
  "css": "theme.css",
  "layout": { "library": "grid" },
  "background": { "type": "video", "src": "fond.mp4" },
  "splash": { "type": "logo", "duration": 1200 },
  "sounds": { "move": "sounds/move.wav", "select": "sounds/select.wav", "back": "sounds/back.wav", "error": "sounds/error.wav", "launch": "sounds/launch.wav" }
}
```

- `vars` : variables CSS posées sur `:root`. L'interface n'utilise que ces variables, aucune couleur n'est écrite en dur. Une variable absente prend la valeur d'Orbe.
- `layout.library` : `grid` (grille), `carousel` (une rangée centrée) ou `list` (une ligne par jeu).
- `background` : `none`, `orb` (orbe animée), `image` ou `video` (`src` relatif au dossier du thème). La vidéo est mise en pause pendant un jeu.
- `splash` : écran de démarrage `orb`, `logo`, `image`, `video` ou `none`, durée en ms (6 s max).
- `sounds` : `move`, `select`, `back`, `error`, `launch` (wav, mp3 ou ogg). Un son absent = silence.
- `theme.css` : vos ajustements. Classes utiles : `.card`, `.is-focused` (élément sélectionné), `.btn`, `.btn--primary`, `.title`, `.hero-title`, `.kicker`, `.topbar`, `.tab`, `.row-item`, `.modal__box`, `.setting`. `:root[data-route="home"]` cible l'accueil.

Les chemins doivent rester dans le dossier du thème (`..` et chemins absolus refusés) et les valeurs des variables ne peuvent pas contenir `url(`, `;` ou `{}` : un thème téléchargé ne peut ni lire vos fichiers ni casser l'interface. Les erreurs de thème sont écrites dans les logs. Les sons d'Orbe sont générés par `node tools/gen-sounds.mjs`.

## Mode kiosque

*Paramètres*, *Mode kiosque* : le launcher reste en plein écran et ne se ferme plus au clavier (Alt+F4 ne suffit pas) ; on le quitte par le menu système.

Pour aller plus loin et **remplacer le bureau Windows** (le PC démarre directement sur le launcher, sans explorateur), à faire avec prudence sur un compte dédié :

1. Créez un compte Windows local réservé au salon et ouvrez une session dessus.
2. Dans `regedit`, clé `HKEY_CURRENT_USER\Software\Microsoft\Windows NT\CurrentVersion\Winlogon`, créez la valeur chaîne `Shell` = chemin complet de `Orbe Launcher.exe`.
3. Déconnectez-vous puis reconnectez-vous.

Pour revenir en arrière : Ctrl+Alt+Suppr, *Gestionnaire des tâches*, *Exécuter une nouvelle tâche*, `regedit`, supprimez la valeur `Shell`, puis reconnectez-vous. Sans explorateur, il n'y a ni barre des tâches ni bureau : gardez un compte administrateur normal à côté.

## Veille

« Mettre en veille » appelle `SetSuspendState`. Si l'hibernation est activée sur le PC, Windows hiberne au lieu de se mettre en veille ; pour une vraie veille : `powercfg /hibernate off` dans un terminal administrateur.

## Signature du code

Un exécutable non signé déclenche SmartScreen. Un certificat auto-signé n'y change rien : il faut un certificat délivré par une autorité reconnue. La CI signe automatiquement si les secrets du dépôt `WIN_CSC_LINK` (fichier `.pfx` encodé en base64) et `WIN_CSC_KEY_PASSWORD` sont présents. Pistes :

- [SignPath Foundation](https://signpath.org) : signature gratuite pour les projets open source (dossier à déposer) ;
- Azure Trusted Signing : abonnement mensuel, vérification d'identité ;
- certificat de signature de code « OV » chez une autorité de certification (payant, au nom du développeur).

Même signé, un nouvel exécutable peut encore afficher SmartScreen quelque temps, jusqu'à ce que sa réputation soit établie.

## Licence

MIT. Polices Archivo et JetBrains Mono sous licence SIL Open Font License (fichiers dans `themes/orbe/fonts`).
