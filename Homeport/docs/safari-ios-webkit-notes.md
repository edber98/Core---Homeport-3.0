# Notes Safari iOS / WebKit — Flow Builder et ngx-vflow

Ce mémo documente les spécificités de Safari (iOS/iPadOS/macOS WebKit) qui impactent l’éditeur de flow (ngx-vflow + HTML/SVG), et les contournements mis en place dans Homeport.

## Points problématiques observés

- Opacity sur des conteneurs HTML au-dessus d’un canvas/viewport (ou avec SVG/foreignObject):
  - L’animation de `opacity` peut déclencher une promotion de couche (“layer compositing”) et induire des artefacts visuels (décalage, “translate” implicite) sur iOS.
  - Effet perçu: le nœud semble se comporter comme en position relative/absolute alors que le CSS ne l’utilise pas.

- Transforms (scale/translate) sur des nœuds contenant des éléments SVG/foreignObject:
  - Safari gère mal certains composites HTML/SVG; `transform: scale()` ou `translateZ(0)` peuvent provoquer des repaints lourds et des saccades.

- box-shadow animés de grande amplitude:
  - Les “auras” via box-shadow animés déclenchent des repaints importants sur iOS; saccades visibles et parfois clignotements.

- SVG foreignObject (HTML dans SVG):
  - Connu pour être partiellement supporté/buggé dans WebKit (focus, événements, calcul de taille/position, clipping).
  - Référence: nous incluons un patch `VflowSafariForeignObjectPatchDirective` pour corriger/contourner certains comportements.

## Stratégie retenue (Homeport)

- Aucune position relative/absolute pour les effets d’animation sur les nœuds.
- Pas d’animations de transform ni d’opacité côté iOS Safari (fallback spécifique).
- Effets 100% “peinture” (background/border) à l’intérieur de la carte (“inset”), sans débordement.
- Détection iOS Safari côté TS (userAgent) pour appliquer des classes alternatives.

### Ajout de nœud ("spawn")

- Navigateur “classique” (non iOS):
  - `.node-card.spawn` → radial-gradient interne + fondu du `background-color`, couvrant toute la carte, puis retour à blanc.
- iOS Safari:
  - `.node-card.spawn-lite` → simple pulse de `background-color` (steps), fluide et sans repaint lourds.

### Suppression de nœud ("removing")

- Navigateur “classique” (non iOS):
  - `.node-card.removing` → petite animation `opacity` (fade-out rapide).
- iOS Safari:
  - `.node-card.removing-lite` → animation de `background-color` + radial-gradient interne (sans `opacity`).

## Bonnes pratiques

- Éviter: `opacity`, `transform`, `box-shadow` animés sur des conteneurs mêlant HTML/SVG (surtout avec foreignObject) en iOS Safari.
- Préférer: animations de `background-image`, `background-size`, `background-color`, `outline-offset` (modérées), en “inset”.
- Limiter la durée et la taille des gradients; privilégier `steps()` pour réduire le nombre de frames si nécessaire.
- Lorsque possible, isoler les repaints par composant (mais `contain: paint` peut aussi causer des artefacts; à utiliser avec prudence sur iOS).

## ngx-vflow et iOS

- Les nodes HTML sont rendus via `foreignObject` dans un SVG. Safari présente des limitations connues:
  - Gestion des focus/événements.
  - Problèmes de clipping et de calcul de bbox lorsque des transforms s’appliquent.
- Dans Homeport:
  - Nous évitons les transforms/opacity sur les nœuds.
  - Nous utilisons des animations de fond contenues dans la carte.
  - Patch de compatibilité (`VflowSafariForeignObjectPatchDirective`) chargé pour iOS.

## Réfs utiles

- Bugs WebKit/Open issues autour de foreignObject, compositing, transforms.
- Guides de performance CSS sur iOS (éviter box-shadow et transforms animés sur gros blocs).

---

Dernière mise à jour: animé spawn/removing iOS vs non-iOS, décembre 2025.
