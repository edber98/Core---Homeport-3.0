# Kinn Pitch Live

Contrôle live de la présentation Kinn avec la **même composition Remotion** que le rendu vidéo — pixel-perfect identique, simplement contrôlé au clavier.

> ⚠ Ne touche **absolument pas** à `MotionDesign/`. Importe juste sa composition via un alias Vite en lecture seule.

## Lancement

```bash
cd KinnPitchLive
npm run dev       # → http://localhost:5173
```

Puis **F** pour le plein écran.

## Comment ça marche

- `<Player>` de `@remotion/player` embarque `KinnPitch` depuis `../MotionDesign/src/KinnPitch.tsx`.
- Une liste de **checkpoints** (frames clés) est définie dans `src/checkpoints.ts`.
- **Espace / →** → le Player joue à vitesse normale jusqu'au prochain checkpoint, puis se met en pause.
- **←** → retour au checkpoint précédent (seek + pause).
- Entre deux checkpoints, c'est la vraie timeline Remotion qui tourne, donc **même rendu, même fluidité** que la vidéo.

## Contrôles clavier

| Touche | Action |
|---|---|
| `Espace` · `→` · `Entrée` · `PageDown` | Jouer jusqu'au prochain point d'arrêt |
| `←` · `Backspace` · `PageUp` | Revenir au point précédent |
| `↓` | Sauter directement au début de la slide suivante |
| `↑` | Slide précédente |
| `Home` | Début |
| `End` | Fin |
| `F` | Plein écran |
| `H` / `?` | Aide |

## Ajuster les points d'arrêt

Ouvrir `src/checkpoints.ts` — chaque entrée `{ frame, slide, label }` définit un point où le Player pause. Tu peux ajouter, retirer ou décaler des frames en connaissant le timing de la composition Remotion (commentaires en haut du fichier).

## Structure

```
KinnPitchLive/
├── vite.config.ts       ← alias "@motion" pointe sur ../MotionDesign/src
├── public/
│   ├── c4rbon-logo.png
│   ├── logo-kinn.svg
│   └── logo-kinn-small.svg
└── src/
    ├── App.tsx          ← Player + keyboard + bottom chrome
    ├── checkpoints.ts   ← liste des frames clés
    ├── hooks/
    │   ├── useKeyboard.ts
    │   └── useFullscreen.ts
    ├── components/      ← Icon, C4rbonLogo, ProviderIcon, AnimatedBg (utilitaires)
    └── styles/          ← CSS global + animations réutilisables
```

## Build production

```bash
npm run build    # sortie dans dist/
npm run preview  # preview local
```

`dist/` est 100 % statique, hébergeable sur n'importe quel static host.
