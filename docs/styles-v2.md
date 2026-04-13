# Charte graphique v2 — Kinn 2.0

## Philosophie

La v2 de Kinn adopte une direction artistique **Apple-like** : minimaliste, aérée, avec des ombres douces plutôt que des bordures, des coins généreux inspirés du logo, et une palette rose signature qui donne de la personnalité sans surcharger.

Le mot d'ordre : **chaque pixel respire.**

---

## Logo

| Variante | Fichier | Usage |
|----------|---------|-------|
| Wordmark complet | `logo-large.svg` | Sidebar ouverte, page login, drawer mobile |
| Icône seule (K) | `logo-petit.svg` | Sidebar collapsed, header mobile, favicon |

Les deux logos utilisent exclusivement la couleur `#e61982`.

---

## Typographie

### Police : Poppins

Choisie pour sa géométrie ronde qui s'harmonise parfaitement avec les courbes du logo Kinn. C'est une police moderne, lisible, avec un caractère friendly mais professionnel.

```
font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Hiérarchie

| Usage | Taille | Poids | Tracking |
|-------|--------|-------|----------|
| Titre principal | 26px | 700 | -0.02em |
| Titre de section | 14-15px | 700 | normal |
| Labels uppercase | 10-11px | 700 | 0.06-0.08em |
| Texte courant | 13-14px | 400-500 | normal |
| Caption / metadata | 11-12px | 400 | normal |

### Principes
- Les titres importants utilisent `font-weight: 800` (Extra Bold)
- Les labels de catégorie sont en uppercase avec letter-spacing large
- Pas d'italique sauf pour les citations
- Line-height : 1.4 pour le texte, 1.1-1.2 pour les titres

---

## Palette de couleurs

### Couleur principale

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Brand | `#e61982` | 230, 25, 130 | CTA, liens, éléments actifs, accents |
| Brand hover | `#d0167a` | 208, 22, 122 | Hover sur éléments brand |
| Brand deep | `#b01266` | 176, 18, 102 | Active/pressed, dégradés profonds |

### Teintes dérivées (rose)

| Token | Hex | Usage |
|-------|-----|-------|
| Brand light | `#fdf2f8` | Fond hover items, fond cartes accent |
| Brand soft | `#fce7f3` | Fond hover actif, fond unread |
| Brand muted | `#f9a8d4` | Bordures accent, éléments secondaires |

### Couleurs fonctionnelles

| Fonction | Hex | Usage |
|----------|-----|-------|
| Success | `#16a34a` | Validations, statut OK |
| Warning | `#f59e0b` | Alertes, attention |
| Error | `#ef4444` | Erreurs, danger |

### Neutres

| Token | Hex | Usage |
|-------|-----|-------|
| Text | `#1a1a1a` | Texte principal |
| Muted | `#8b8b8b` | Texte secondaire, labels |
| Light muted | `#b0b0b0` | Timestamps, metadata |
| Placeholder | `#c4c4c4` | Texte placeholder |
| Background | `#f8f8f8` | Fond de page principal |
| White | `#ffffff` | Cartes, sidebar, header elements |

---

## Ombres (pas de bordures)

Le principe v2 : **les ombres définissent la hiérarchie**, pas les bordures. On utilise des ombres très subtiles pour créer de la profondeur sans alourdir.

| Niveau | Valeur | Usage |
|--------|--------|-------|
| Repos | `0 1px 3px rgba(0,0,0,0.04)` | Boutons header, cartes au repos |
| Légère | `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)` | Cartes dashboard |
| Focus | `0 0 0 2px rgba(230,25,130,0.12)` | Inputs, search bar focus |
| Élevée | `0 12px 40px rgba(0,0,0,0.1)` | Dropdowns, popovers, modals |
| Brand | `0 2px 10px rgba(230,25,130,0.3)` | Nav item actif |
| Brand hover | `0 4px 14px rgba(230,25,130,0.3)` | Bouton IA hover |

### Dégradé sidebar (pattern réutilisable)

Quand un panneau latéral (sidebar conversations, panneau de filtres, etc.) est adjacent au header ou à une zone de fond `#f8f8f8`, on utilise un dégradé vertical pour éviter la coupure nette :

```css
background: linear-gradient(180deg, #f8f8f8 0%, #ececec 100%);
```

- **Haut** : `#f8f8f8` — se fond avec le fond de l'app / header
- **Bas** : `#ececec` — assez foncé pour que le panneau se distingue

Ce pattern remplace une bordure droite et crée une transition naturelle.

### Quand utiliser une bordure ?
- **Séparateurs internes** : `1px solid #f0f0f0` (très subtil, presque invisible)
- **Sidebar** : aucune bordure droite, le contraste blanc/gris suffit
- **Header** : aucune bordure inférieure, transparence sur fond gris
- **Search bar** : aucune bordure visible, ombre seule
- **Inputs (formulaires)** : bordure subtile `#e5e7eb` car nécessaire pour l'affordance

---

## Border Radius

Inspiré directement des courbes du logo Kinn 2.0.

| Token | Valeur | Usage |
|-------|--------|-------|
| Large | `18px` | Coins du main area, modals, popovers |
| Standard | `14-16px` | Cartes, boutons principaux, search bar |
| Medium | `10px` | Nav items, boutons icônes, KPI chips |
| Small | `8px` | List items hover, badges, petits éléments |
| Pill | `999px` | Avatar, badges numériques |
| Input | `22px` | Champ AI (style capsule) |

---

## Composants

### Sidebar
- **Fond** : blanc `#fff`
- **Pas de bordure droite** — le contraste avec le fond `#f8f8f8` suffit
- **Padding interne** : 6px (crée un espacement entre les items et les bords)
- **Logo** : `logo-large.svg` centré (ouvert) / `logo-petit.svg` (collapsed)
- **Nav items** : radius 10px, color `#8b8b8b`, gap 1px
- **Nav item actif** : fond `#e61982`, texte blanc, ombre rose
- **Nav item hover** : fond `#fdf2f8`, texte `#1a1a1a`
- **Toggle** : icône fold/unfold, fond transparent, hover rose
- **Transition collapse** : 0.25s cubic-bezier(.4,0,.2,1)
- **Largeur** : 230px (ouvert) / 68px (collapsed)

### Header
- **Fond** : transparent (sur le fond `#f8f8f8`)
- **Pas de bordure inférieure**
- **Hauteur** : 52px (desktop) / 48px (mobile)
- **Search bar** : fond blanc, radius 14px, ombre 1px, focus = ring rose
- **Shortcuts `⌘K`** : fond `#f8f8f8`, radius 5px, texte `#b0b0b0`
- **Boutons icônes** : 34px, radius 10px, fond blanc, ombre 1px
- **Bouton IA** : fond `#e61982`, texte blanc (toujours visible)
- **Avatar** : 30px, fond `#e61982`, texte blanc

### Dashboard
- **Fond** : `#f8f8f8`
- **Cartes** : fond blanc, radius 16px, ombre soft (pas de bordure)
- **KPI intro** : gradient `#fdf2f8` → `#fce7f3`, texte rose
- **KPI chips** : fond `#fafafa`, radius 10px
- **Orbes IA** : dégradés roses (remplace les bleus)
- **Input IA** : capsule blanche, radius 22px, ombre, focus ring rose
- **Hints IA** : fond blanc, ombre 1px, hover rose
- **List items** : hover `#fdf2f8`, radius 8px
- **Scrollbars** : très fines (6px), thumb `rgba(0,0,0,0.08)`

### Login
- **Layout split** : gauche 44% gradient rose, droite formulaire
- **Inputs** : height 46px, radius 14px, focus ring rose
- **Bouton principal** : fond `#e61982`, radius 14px, ombre rose
- **Bouton secondaire** : outline, hover → fond rose léger
- **Comptes test** : cartes cliquables, hover rose

### Dropdowns / Popovers
- **Radius** : 18px
- **Ombre** : `0 12px 40px rgba(0,0,0,0.1)`
- **Padding interne** : 8px
- **Items** : radius 10px, hover `#fdf2f8`
- **Séparateurs** : `1px solid #f0f0f0`

### Modals
- **Radius** : 20px
- **Fond** : blanc
- **Ombre** : portée par le overlay

---

## Interactions & Animations

| Élément | Effet |
|---------|-------|
| Nav item actif | Ombre rose `0 2px 10px` |
| Bouton hover | Fond rose léger, ombre légère |
| Carte hover | `translateY(-2px)`, ombre rose |
| Hint IA hover | `translateY(-1px)`, ombre rose |
| Sidebar collapse | Transition width 0.25s ease |
| Orbes dashboard | Animation lente 40-48s (organic float) |
| Search focus | Ring rose 2px |
| Snap scroll | `scroll-snap-type: y mandatory` |

---

## Responsive

| Breakpoint | Comportement |
|-----------|--------------|
| `≥ 1024px` | Sidebar + header + grid 12 colonnes |
| `769-1023px` | Sidebar + grid 2 colonnes |
| `≤ 768px` | Drawer mobile, header compact, grid 1 colonne |
| `≤ 480px` | Espacement réduit, shortcuts cachés |

### Mobile-first principles
- Touch targets : minimum 34px
- Safe area padding (iPhone notch)
- `-webkit-overflow-scrolling: touch`
- Swipe-to-close sur le drawer (56px threshold)

---

## CSS Variables globales

```css
:root {
  --hp-brand: #e61982;
  --hp-brand-light: #fdf2f8;
  --hp-brand-soft: #fce7f3;
  --hp-brand-hover: #d0167a;
  --hp-radius: 14px;
  --hp-radius-sm: 10px;
  --hp-menu-hover-bg: linear-gradient(135deg, #fdf2f8, #fce7f3);
}
```

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/index.html` | Import Google Fonts (Poppins) |
| `src/theme.less` | Variables NG-Zorro |
| `src/styles.scss` | Styles globaux + overrides |
| `src/app/layout/layout-main/` | Sidebar, header, drawer, dropdowns |
| `src/app/layout/layout-auth/` | Page login |
| `src/app/features/dashboard/` | Dashboard home |
| `public/imgs/logo-large.svg` | Logo complet |
| `public/imgs/logo-petit.svg` | Icône K |
| `docs/styles-v2.md` | Ce document |

---

## Principes directeurs

1. **Ombres > Bordures** — Les ombres créent la profondeur, les bordures alourdissent
2. **Le rose comme fil conducteur** — Présent subtilement partout (hover, focus, accents)
3. **Poppins pour la personnalité** — Ronde, moderne, cohérente avec le logo
4. **Coins généreux** — 14-18px partout, ça donne un côté doux et premium
5. **Fond gris `#f8f8f8`** — Les cartes blanches ressortent naturellement
6. **Contraste par la couleur, pas par les traits** — Blanc sur gris suffit à séparer
7. **Animations subtiles** — Transitions 0.12s, micro-interactions, pas de flash
