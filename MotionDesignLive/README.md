# Kinn — Motion Design

Vidéos de présentation marketing pour Kinn (Homeport 1.0), réalisées avec [Remotion](https://www.remotion.dev/).

## Compositions

| ID | Durée | Usage |
|---|---|---|
| `KinnPromo` | 65s | Vidéo explainer complète (9 scènes) |
| `KinnTeaser` | 30s | Format teaser court (scènes vedettes uniquement) |

Résolution : **1920×1080 @ 30fps**.

## Storyboard (version 65s)

| # | Scène | Durée | Message |
|---|---|---|---|
| 1 | Cold Open | 3s | Logo Kinn + *"Your AI workforce"* |
| 2 | Le problème | 5s | Chaos des outils disparates |
| 3 | Interface | 5s | Le user tape son intention |
| 4 | **Multi-agent** ⭐ | 11s | Denis délègue à Tim, Ada, Alan en parallèle |
| 5 | Todo list live | 7s | Progression temps réel, tool calls visibles |
| 6 | **Flow builder** ⭐ | 11s | L'agent construit un workflow automatiquement |
| 7 | Galerie d'agents | 8s | Les 14 spécialistes |
| 8 | Niveaux d'autonomie | 6s | Prudent · Équilibré · Autonome |
| 9 | Intégrations + CTA | 8s | Orbite d'intégrations + slogan |

## Développement

```bash
cd MotionDesign
npm install
npm start        # lance Remotion Studio (édition live)
```

## Rendu

```bash
npm run build           # KinnPromo.mp4 → out/kinn-promo.mp4
npm run build:teaser    # KinnTeaser.mp4 → out/kinn-teaser.mp4
npm run build:all       # les deux
```

## Voix-off & musique

Les deux compositions (`src/KinnPromo.tsx` et `src/KinnTeaser.tsx`) contiennent un slot `<Audio>` commenté. Il suffit de :

1. Déposer le fichier dans `public/` (ex: `public/audio.mp3`).
2. Décommenter la balise `<Audio>` et ajuster le `src`.

## Personnalisation

- **Couleurs & polices** : `src/theme.ts` (palette Kinn fidèle à l'app réelle)
- **Composants UI** (AppShell, ChatMessage, FlowNode…) : `src/components/`
- **Scènes** : `src/scenes/S01_*.tsx` à `S09_*.tsx` (modulaires, réutilisables)

## Assets

- `public/logo-kinn.svg` — logo principal (copié depuis `Homeport/public/imgs/logo-large.svg`)
- `public/logo-kinn-small.svg` — version compacte
