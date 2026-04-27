# Kinn Pitch Live — Video Edition

Présentation live basée sur des **MP4 pré-rendus** → 60 fps stables, plein écran
fluide, zéro React re-render pendant la lecture.

> Chaque slide est une vidéo indépendante avec un fondu noir intégré aux
> extrémités. Entre deux slides il y a du noir contrôlé par le présentateur.

---

## 🎬 Préparation pour la conférence (30 minutes)

### Étape 1 — Rendre les 13 MP4 individuellement

Ouvre **un deuxième terminal** (ton render principal peut continuer dans le
premier) :

```bash
cd "MotionDesignLive"
./render-slices.sh
```

Ça rend les 13 slices dans `MotionDesignLive/out/slices/`.
Durée totale ≈ 25-35 min selon la machine.

> Tu peux **accélérer en parallèle** : ouvre 2-3 terminaux et lance
> `npx remotion render <id> out/slices/<id>.mp4` pour 2-3 IDs simultanément.

Liste des IDs si tu veux parallélliser à la main :
`p00-origin`, `p01-hook`, `p02-workflow-concept`, `p03-workflow-builder`,
`p04-bridge`, `p05-agents`, `p06-prompt-demo`, `p07-sandbox`, `p08-permissions`,
`p09-workflow-agentic`, `p10-confidentiality`, `p11-use-cases`, `p12-closing`.

### Étape 2 — Copier les MP4 dans l'app live

```bash
cp MotionDesignLive/out/slices/*.mp4 KinnPitchLiveVideo/public/slices/
```

### Étape 3 — Lancer l'app en plein écran

```bash
cd KinnPitchLiveVideo
npm run build
npm run preview          # → http://localhost:4174
```

Appuie sur **F** pour plein écran, **Espace** pour démarrer.

---

## 🎹 Contrôles clavier

| Touche | Action |
|---|---|
| `Espace` · `→` · `Entrée` | Lecture · ou si lecture en cours : **passe à la slide suivante** |
| `←` | Slide précédente (redémarre depuis le début) |
| `↓` | Slide suivante (sans lire) |
| `↑` | Slide précédente |
| `Home` · `End` | Première · Dernière slide |
| `F` | Plein écran |
| `H` · `?` | Afficher les raccourcis |

**Logique du skip** : quand tu cliques pendant la lecture, la vidéo courante
s'arrête net et la suivante apparaît en "prêt à lancer" (première frame noire
visible). Tu cliques à nouveau pour la lancer. C'est cette micro-pause noire
que tu contrôles oralement entre deux slides.

---

## 🛡️ Safeguards pour le jour J

1. **Build prod** (`npm run preview`, pas `npm run dev`) — 2× plus rapide.
2. **Plein écran F11** côté navigateur en plus du F interne.
3. **Coupe les notifications** macOS (Ne pas déranger).
4. **Branche ton laptop sur secteur** — décode vidéo HD consomme du CPU.
5. **Recharge la page avant de démarrer** pour que tous les MP4 soient en cache.
6. **Fallback** : si l'app plante, les MP4 sont lisibles dans n'importe quel
   lecteur. Tu peux même les glisser dans PowerPoint/Keynote à la volée.

## 🔧 Bundle léger

Le bundle fait **48 Ko gzippé** (149 Ko brut). Zéro Remotion côté client,
juste React + la logique clavier. Les vidéos sont streamées depuis `/slices/`.

## Structure

```
KinnPitchLiveVideo/
├── public/slices/          ← 13 MP4 ici
└── src/
    ├── main.tsx            entry point
    ├── App.tsx             player + keyboard + chrome
    └── slides.ts           playlist (id, titre, chemin fichier)
```
