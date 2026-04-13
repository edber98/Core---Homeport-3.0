# Flow Builder — Guide de styles complet

> Chaque couleur, taille, ombre, animation utilisée dans le flow builder.
> Nœuds, edges, handles, canvas, palette, panels, animations.

---

## Palette de couleurs

| Usage | Couleur | Hex |
|-------|---------|-----|
| Primary (sélection, liens, CTA) | Bleu | `#1677ff` |
| Branche erreur (try/catch) | Rose | `#f759ab` |
| Erreur hard (validation) | Rouge | `#ef4444` |
| Succès / Exécution OK | Vert | `#16a34a` |
| Déploiement | Vert foncé | `#059669` |
| Suppression | Rouge foncé | `#b91c1c` |
| Edge normal | Gris | `#b1b1b7` |
| Bordure | Gris clair | `#e5e7eb` |
| Texte principal | Noir | `#111` |
| Texte secondaire | Gris moyen | `#6b7280` |
| Texte tertiaire | Gris clair | `#8c8c8c` |
| Fond canvas | Gris très clair | `#EEF0F4` |
| Fond carte / panneaux | Blanc | `#fff` |
| Disabled | Gris | `#bbb` |

---

## Ombres

| Niveau | Valeur | Usage |
|--------|--------|-------|
| Subtile | `0 1px 2px rgba(0,0,0,0.04)` | Cartes palette, badges |
| Légère | `0 1px 2px rgba(0,0,0,0.06)` | Edge labels, exec badge |
| Sélection | `0 0 0 2px rgba(22,119,255,0.15)` | Nœud sélectionné (glow bleu) |
| Sélection erreur | `0 0 0 2px rgba(247,89,171,0.35)` | Nœud erreur sélectionné |
| Moyenne | `0 8px 20px rgba(0,0,0,0.08)` | Bottom bar, top bar, FABs |
| Forte | `0 8px 20px rgba(0,0,0,0.12)` | FAB toggle panneaux |
| Très forte | `0 10px 24px rgba(0,0,0,0.18)` | Drag preview, context menu, tooltip |
| Hover bleu | `0 4px 12px rgba(22,119,255,0.18)` | Boutons hover |
| Hover vert | `0 6px 16px rgba(5,150,105,0.25)` | Deploy hover |
| Hover rouge | `0 6px 16px rgba(220,38,38,0.25)` | Undeploy hover |

---

## Typographie

| Élément | Poids | Taille | Couleur |
|---------|-------|--------|---------|
| Titre nœud | 600 (bold) | 13px | `#111` |
| Subtitle nœud | 400 | 12px | `#8c8c8c` |
| Description nœud | 400 | 12px | `#6b7280` |
| Handle label | 400 | 12px | `#6b7280` |
| Edge label | 400 | 12px | `#111` |
| Badge count | 400 | 11px | `#374151` |
| Child label | 400 | 11px | `#a1a8b8` |
| Monospace | — | 12px | `#6b7280` |

**Font monospace** : `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`

---

## Node Card (carte d'un nœud)

### Dimensions et layout

```css
.node-card {
  width: 223px;
  min-width: 223px;
  max-width: 223px;
  min-height: 70px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 0 0 0;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  column-gap: 6px;
}
```

### États visuels

```
┌─────────── 223px ──────────────┐
│                                │  ← border: 1px solid #e5e7eb
│  [icône 28x28]  Titre          │     border-radius: 8px
│                 Subtitle       │     min-height: 70px
│                                │
│  Description (max 3 lignes)    │
│                                │
│  ● in              out ●      │
│                     err ●      │
│                           ✅ 3 │  ← exec badge (top-right)
└────────────────────────────────┘
```

| État | Bordure | Ombre |
|------|---------|-------|
| Normal | `1px solid #e5e7eb` | aucune |
| Sélectionné | `1px solid #1677ff` | `0 0 0 2px rgba(22,119,255,0.15)` |
| Branche erreur | `1px solid rgba(247,89,171,0.63)` | aucune |
| Erreur + sélectionné | `1px solid #f759ab` | `0 0 0 2px rgba(247,89,171,0.35)` |
| Hard error (validation) | `1px solid #ef4444` | aucune |
| Hard error + sélectionné | `1px solid #ef4444` | `0 0 0 2px rgba(239,68,68,0.35)` |

### Zone centrale

```css
.node-card .center-wrap {
  padding: 0 8px 2px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
}
```

---

## App Icon (icône du provider dans le header)

```css
.app-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;            /* carré arrondi */
  background: #f3f4f6;           /* gris clair par défaut */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.app-icon i {
  font-size: 16px;
}

.app-icon img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}
```

Résumé :
- **Conteneur** : 28x28px, coins arrondis 8px
- **Icône Font Awesome** : 16px
- **Image logo** : 18x18px, contain

---

## Description du nœud

```css
.node-card .desc {
  color: #6b7280;
  font-size: 12px;
  white-space: pre-line;         /* garde les retours à la ligne */
  word-break: break-word;
  margin: 6px 0;
}

/* Troncature à 3 lignes */
.node-card .desc.clamp {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  white-space: normal;
}
```

---

## Handles (ports d'entrée/sortie)

### Layout des handles

```css
/* Conteneur des entrées */
.node-card .inputs {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-direction: row;
}

/* Conteneur des sorties */
.node-card .outputs {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-direction: row;
}

.node-card .outputs .out {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
}
```

### Handle (cercle SVG)

| État | Rayon | Remplissage | Contour | Épaisseur |
|------|-------|-------------|---------|-----------|
| Idle | 4px | `#000` (normal) / `#f759ab` (erreur) | `#fff` | 1px |
| Valid (connexion possible) | 6px | `#000` / `#f759ab` | `#22c55e` (vert) | 2px |
| Invalid (connexion impossible) | 4px | — | `#ef4444` (rouge) | 2px |
| Connecté | 4px | `#000` / `#f759ab` | `#fff` | 1px |

```html
<!-- SVG du handle -->
<svg:circle
  [attr.r]="state === 'valid' ? 6 : 4"
  [attr.fill]="isError ? '#f759ab' : '#000000'"
  [attr.stroke]="state === 'valid' ? '#22c55e' : '#ffffff'"
  [attr.stroke-width]="state === 'valid' ? 2 : 1"
/>
```

### Position selon l'orientation

| Orientation | Entrées | Sorties |
|-------------|---------|---------|
| Vertical | En haut (`top`) | En bas (`bottom`) |
| Horizontal | À gauche (`left`) | À droite (`right`) |

### Orientation horizontale — centrage vertical

```typescript
// Centrage de N handles dans la hauteur du nœud (70px)
horizHandleTop(index: number, count: number): number {
  const gap = 16;  // 16px entre chaque handle
  const totalHeight = (count - 1) * gap;
  const startY = (70 - totalHeight) / 2;
  return startY + index * gap;
}
```

---

## Linked Handles (champs nommés à droite)

Pour les nœuds extracteurs, les handles liés affichent un label :

```css
.node-card .links {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

/* Vertical : colonne à droite */
.node-card:not(.horizontal) .links {
  flex-direction: column;
  align-items: flex-end;
}

/* Horizontal : ligne centrée */
.node-card.horizontal .links {
  flex-direction: row;
  justify-content: center;
  flex-wrap: wrap;
}

.node-card .link-label {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-card .link-child-label {
  font-size: 11px;
  color: #a1a8b8;
  padding-left: 10px;
}

.node-card .link-child-label .type {
  font-size: 10px;
  color: #bcc3d0;
}

.node-card .link-chevron {
  font-size: 9px;
  color: #94a3b8;
}
```

Layout desc + links côte à côte :

```
┌─────────────────────────────────────────┐
│  [icon]  Extraire des données           │
│                                         │
│  Description du nœud   | nom      ─●    │
│  sur plusieurs lignes  | email    ─●    │
│                        | téléphone─●    │
└─────────────────────────────────────────┘
```

```css
.node-card .desc-links {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 0 8px;
}

.node-card .desc-links > .desc {
  flex: 1 1 auto;
}

.node-card .desc-links > .links {
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
```

---

## Assist Line (ligne d'aide pour connecter)

Ligne pointillée + bouton "+" qui apparaît sur les handles non connectés :

```
● ─ ─ ─ ─ ⊕    ← assist line (24px) + bouton plus (r=8)
```

### Ligne SVG

```html
<svg:line
  x1="0" y1="0"
  x2="24" y2="0"              <!-- 24px de long -->
  stroke="#000000"             <!-- noir normal, #f759ab pour erreur -->
  stroke-width="2"
  stroke-linecap="round"
  opacity="0.9"
/>
```

### Bouton plus

```html
<svg:circle
  cx="34" cy="0"               <!-- 34px du handle -->
  r="8"                        <!-- rayon 8px -->
  fill="#ffffff"
  stroke="#000000"             <!-- noir normal, #f759ab pour erreur -->
  stroke-width="1.5"
  cursor="pointer"
/>
<svg:text
  x="34" y="3"
  text-anchor="middle"
  font-size="12"
  font-weight="700"
  fill="#000000"               <!-- noir normal, #f759ab pour erreur -->
>+</svg:text>
```

### Animations d'entrée/sortie

```css
/* Horizontal */
@keyframes assistInH {
  0%   { opacity: 0; transform: translateX(-12px); }
  100% { opacity: 0.9; transform: translateX(0); }
}
@keyframes assistOutH {
  0%   { opacity: 0.9; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(-12px); }
}

/* Vertical */
@keyframes assistInV {
  0%   { opacity: 0; transform: translateY(-12px); }
  100% { opacity: 0.9; transform: translateY(0); }
}
@keyframes assistOutV {
  0%   { opacity: 0.9; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-12px); }
}
```

Durées : entrée 180ms, sortie 140ms.

---

## Edges (connexions entre nœuds)

### Path SVG

```html
<svg:path
  [attr.d]="ctx.path()"           <!-- calculé par backAwareCurve -->
  fill="none"
  [attr.stroke]="edge.data?.color || '#b1b1b7'"
  [attr.stroke-width]="edge.data?.strokeWidth || 2"
/>
```

### Couleurs des edges

| Contexte | Couleur | Hex |
|----------|---------|-----|
| Normal | Gris | `#b1b1b7` |
| Branche erreur | Rose | `#f759ab` |
| Edge pris (exécution) | Bleu | `#1677ff` |
| Preview (drag en cours) | Gris | `#b1b1b7` + `stroke-dasharray: 5,5` |

### Flèche (marker)

```javascript
markers: {
  end: {
    type: 'arrow-closed',
    color: '#b1b1b7'            // même couleur que l'edge
  }
}
```

### Connection preview (pendant le drag)

```html
<svg:path
  [attr.d]="ctx.path()"
  stroke="#b1b1b7"
  stroke-width="2"
  fill="none"
  stroke-dasharray="5,5"         <!-- tirets -->
/>
```

---

## Edge Labels (badges sur les connexions)

```
         ┌─────────┐
─────────┤ Succès  ├──────────
         └─────────┘
              ✕              ← bouton supprimer (hover)
```

```css
.edge-labels {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* Badge label */
.edge-labels .badge.label {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 12px;
  color: #111;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}

/* Badge label erreur */
.edge-labels .badge.label.error {
  border-color: #f759ab;
  color: #f759ab;
}

/* Bouton supprimer */
.edge-labels .badge.delete {
  width: 28px;
  height: 22px;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edge-labels .badge.delete i {
  font-size: 14px;
  color: #b91c1c;              /* rouge foncé */
}
```

---

## Canvas

```css
.canvas {
  border: 0 1px 1px 1px solid #e5e7eb;  /* pas de bordure en haut */
  border-radius: 0;
  overflow: hidden;
  position: relative;
  height: 100%;
  transition: border-color 180ms ease;
}
```

### Fond du canvas (ngx-vflow)

```typescript
flowBackground = { type: 'dots' };  // motif de points
```

Couleur de fond par défaut : `#EEF0F4`

### Canvas vide — carte de démarrage

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│                               │
│           ┌────┐              │  ← border: 1px dashed #cbd5e1
│           │ ＋ │              │     border-radius: 14px
│           └────┘              │     padding: 14px 18px
│     Créer un déclencheur      │
│     Choisir comment            │
│     démarrer le workflow      │
│                               │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

```css
.empty-starter .starter-card {
  border: 1px dashed #cbd5e1;
  background: #fff;
  border-radius: 14px;
  padding: 14px 18px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  cursor: pointer;
}

.starter-card:hover {
  border-color: #94a3b8;
  background: #f9fafb;
}

.starter-card .ico {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  font-weight: 800;
  color: #111;
}

.starter-card .title {
  font-weight: 700;
  font-size: 13px;
  color: #0f172a;
}

.starter-card .hint {
  font-size: 12px;
  color: #64748b;
}
```

---

## Exec Badge (indicateur d'exécution)

Position : coin supérieur droit du nœud (overlay grid).

```
                              ┌──────────┐
                              │ ✅  3    │
                              └──────────┘
```

```css
.node-card .exec-badge {
  grid-column: 1;
  grid-row: 1;
  align-self: start;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;           /* pill */
  padding: 2px 6px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  cursor: pointer;
  z-index: 10;
}

.exec-badge:hover {
  transform: scale(1.1);
}
```

### Icônes du badge

| État | Icône | Couleur |
|------|-------|---------|
| Succès | `fa-circle-check` | `#16a34a` (vert) |
| Erreur | `fa-triangle-exclamation` | `#ef4444` (rouge) |
| Stop | `fa-stop` | `#111827` (noir) |
| En attente | `fa-clock` | `#6b7280` (gris) |

Le compteur (`.cnt`) : `font-size: 11px`, `color: #374151`.

---

## Error Badge (validation)

Position : même overlay que l'exec badge.

```css
.node-card .error-badge {
  color: #ef4444;
  background: #fff;
  border: 1px solid #fca5a5;     /* rouge clair */
  border-radius: 999px;          /* cercle */
  width: 18px;
  height: 18px;
  font-size: 11px;
}
```

---

## Tooltip (survol des handles)

```css
.flow-tooltip {
  position: fixed;
  z-index: 200;
  background: #111;
  color: #fff;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.18);
  pointer-events: none;
  white-space: nowrap;
}

.flow-tooltip.error {
  background: #f759ab;
  color: #fff;
}
```

---

## Animations des nœuds

### Spawn (ajout d'un nœud)

Effet de ripple bleu + fade vers blanc :

```css
.node-card.spawn {
  background-color: rgba(22,119,255,0.06);
  background-image: radial-gradient(
    circle at center,
    rgba(22,119,255,0.22) 0%,
    rgba(22,119,255,0.14) 30%,
    rgba(22,119,255,0.00) 31%
  );
  animation:
    node-ripple-inset 1000ms ease-out both,
    node-bg-fill 1000ms ease-out both;
}

@keyframes node-ripple-inset {
  0%   { background-size: 0% 0%; }
  70%  { background-size: 170% 170%; }
  100% { background-size: 170% 170%; }
}

@keyframes node-bg-fill {
  0%   { background-color: rgba(22,119,255,0.06); }
  60%  { background-color: rgba(22,119,255,0.10); }
  100% { background-color: #ffffff; }
}
```

### Spawn lite (version rapide)

```css
.node-card.spawn-lite {
  animation: node-bg-lite 650ms steps(6, end) both;
}

@keyframes node-bg-lite {
  0%   { background-color: rgba(22,119,255,0.06); }
  100% { background-color: #ffffff; }
}
```

### Suppression

```css
/* Fade out simple */
.node-card.removing {
  animation: node-remove-opacity 220ms ease-in forwards;
}

@keyframes node-remove-opacity {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}

/* Wipe rouge (suppression visuelle) */
.node-card.removing-lite {
  --wipe: rgba(239, 68, 68, 0.18);
  animation:
    node-wipe 420ms ease-out forwards,
    node-clean 420ms ease-out forwards;
}

@keyframes node-wipe {
  0%   { background-size: 0% 0%, 0% 100%; }
  35%  { background-size: 120% 120%, 0% 100%; }
  100% { background-size: 160% 160%, 100% 100%; }
}
```

---

## Node Log Bubble (streaming pendant l'exécution)

Bulle de log qui apparaît sous un nœud pendant son exécution :

```css
.node-log-bubble {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  color: #475569;
  background: linear-gradient(
    90deg,
    rgba(99,102,241,0.06) 0%,
    rgba(99,102,241,0.15) 50%,
    rgba(99,102,241,0.06) 100%
  );
  background-size: 200% 100%;
  animation: log-shimmer 2s ease-in-out infinite;
  max-width: 250px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

/* Curseur clignotant */
.node-log-bubble .log-cursor {
  width: 2px;
  height: 1em;
  background: #6366f1;          /* indigo */
  border-radius: 1px;
  animation: cursorBlink 1s step-end infinite;
}

@keyframes log-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0; }
}

/* Reveal du texte lettre par lettre */
.log-reveal {
  animation: revealA .35s ease forwards;
}

@keyframes revealA {
  from { opacity: 0; filter: blur(3px); }
  to   { opacity: 1; filter: blur(0); }
}
```

---

## Bottom Bar (barre de contrôles)

Position fixe en bas au centre du canvas :

```css
.bottom-bar {
  position: absolute;
  left: 0; right: 0; bottom: 12px;
  z-index: 20;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.bottom-bar .actions {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 2px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 12px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
}
```

### Boutons

| Bouton | Fond | Couleur | Taille | Hover |
|--------|------|---------|--------|-------|
| Icon button | transparent | `#111` | 36x32px | `rgba(22,119,255,0.1)` + shadow bleu |
| Run | `#1677ff` | `#fff` | 32px h | `#0f66e8` + shadow bleu |
| Deploy | `#059669` | `#fff` | 32px h | `#047857` + shadow vert |
| Undeploy | `#dc2626` | `#fff` | 32px h | `#b91c1c` + shadow rouge |

```css
/* Bouton icône */
.bottom-bar .icon-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  width: 36px;
  height: 32px;
}

.icon-btn:hover:not(:disabled) {
  background: rgba(22,119,255,0.1);
  color: #1677ff;
  box-shadow: 0 4px 12px rgba(22,119,255,0.18);
  transform: translateY(-1px);
}

.icon-btn.active {
  border-color: #1677ff;
  color: #1677ff;
}

.icon-btn:disabled {
  color: #bbb;
  cursor: not-allowed;
}

/* Séparateur */
.bottom-bar .divider {
  width: 1px;
  height: 28px;
  margin: 0 2px;
  background: #e5e7eb;
}
```

---

## Panneaux latéraux

### Dimensions

| Panneau | Largeur | Animation |
|---------|---------|-----------|
| Gauche (palette) | 320px | `width 180ms ease` |
| Droite (inspector) | 320px | `width 180ms ease` |
| Fermé | 0px + `opacity: 0` | même transition |

### FABs (boutons flottants pour toggle)

```css
.panel-toggle-fab {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
  z-index: 25;
  transition: right 180ms ease;
}
```

| FAB | Position | Icône active |
|-----|----------|-------------|
| Panneau droit | `top: 12px, right: 12px` | `#1677ff` |
| AI Chat | `top: 60px` | `#6b7280` |
| Aide | `top: 108px` | `#1677ff` |
| Clear run | `top: 156px` | `#6b7280` |
| Panneau gauche | `top: 12px, left: 12px` | `#1677ff` |

Quand un panneau est ouvert, le FAB se décale de 332px.

---

## Palette (panneau gauche)

### Item de la palette (template draggable)

```
┌──────────────────────────────────────┐
│ [icon 16px]  Envoyer un email        │  ← border: 1px solid #e5e7eb
│              SMTP                    │     border-radius: 10px
│              Envoie un email via...  │     padding: 10px 12px
└──────────────────────────────────────┘     cursor: grab
```

```css
.palette .item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: grab;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.item:active { cursor: grabbing; }
.item.disabled { opacity: 0.5; cursor: not-allowed; }
.item.dragging { opacity: 0.6; }
```

### Drag preview

```css
:host ::ng-deep .cdk-drag-preview {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.18);
}
```

### Groupe de palette

```css
.palette .group-title {
  font-weight: 600;
  font-size: 13px;
  color: #111;
  margin: 10px 0 8px;
}

/* Mini icône du groupe */
.group-title .group-mini {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  margin-right: 6px;
}

.group-mini i { font-size: 10px; color: #fff; }
.group-mini img { width: 10px; height: 10px; }
```

---

## Sélection rectangle (marquee)

```css
.selection-box {
  position: fixed;
  border: 1px dashed #1677ff;
  background: rgba(22,119,255,0.08);
  pointer-events: none;
  z-index: 9999;
}
```

---

## Menu contextuel

```css
.ctx-menu {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.18);
  padding: 6px;
  min-width: 220px;
}

.ctx-menu button {
  background: #fff;
  color: #111;
  padding: 8px 10px;
  border-radius: 6px;
  display: flex;
  gap: 8px;
}

.ctx-menu button:hover { background: #f5f5f6; }
.ctx-menu button.danger { color: #b91c1c; }
```

---

## Top Bar (bannière de production)

Quand le flow est déployé :

```css
.production-banner {
  background: linear-gradient(90deg, #059669, #047857);
  border: 1px solid #047857;
  border-radius: 10px;
  padding: 6px 14px;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  animation: banner-in 300ms ease both;
}

.production-banner i {
  animation: pulse-icon 2s ease infinite;
}

.production-banner .event-count {
  background: rgba(255,255,255,0.18);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
}
```

---

## Loading overlay

```css
.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.8);
  z-index: 10;
}

.loading-overlay .spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e5e7eb;
  border-top-color: #111827;
  border-radius: 50%;
  animation: fb-spin 0.8s linear infinite;
}
```

---

## Responsive

### Tablette (< 1280px)

- Panneaux latéraux masqués (`display: none`)
- FABs visibles pour toggle
- Bottom bar en `position: fixed` avec `safe-area-inset-bottom`
- Boutons Run/Deploy en mode icon-only (32x32px)

### Mobile (< 768px)

- Même layout que tablette
- FABs repositionnés (top: 12, 60, 108, 156px)

### Support `svh` / `dvh`

```css
@supports (height: 100svh) {
  .flow-builder { height: 100svh; }
}
@supports (height: 100dvh) {
  .flow-builder { height: 100dvh; }
}
```
