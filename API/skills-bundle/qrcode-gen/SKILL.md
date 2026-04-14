---
name: qrcode-gen
description: Génère un QR code (PNG) à partir de texte ou d'une URL.
runtime: python
entrypoint: /app/skills-bundle/qrcode-gen/gen.py
version: 1.0.0
license: MIT
mimeType: image/png
outputExt: png
tools: [skill_execute]
tags: [qrcode, image, png, barcode]
timeoutMs: 20000
---

# qrcode-gen — Générer un QR code

## Quand utiliser
Quand il faut produire un QR code pour : URL, vCard, Wi-Fi, texte arbitraire. Livré en PNG prêt à imprimer ou intégrer.

## Schéma d'entrée (stdin)
```json
{
  "data": "https://www.homeport.app",
  "size": 10,
  "border": 4,
  "errorCorrection": "M",
  "foreground": "#000000",
  "background": "#FFFFFF",
  "outputName": "homeport-qr"
}
```

- `size` : box size in pixels per module (défaut 10).
- `border` : quiet zone in modules (défaut 4, min 4 selon spec).
- `errorCorrection` : `L`, `M` (défaut), `Q`, `H` (plus haut = plus dense).
- `foreground`/`background` : couleurs hex (`#RRGGBB`).

## Exemple — QR vCard
```json
{
  "data": "BEGIN:VCARD\nVERSION:3.0\nN:Dupont;Jean\nFN:Jean Dupont\nEMAIL:jean@ex.com\nTEL:+33601020304\nEND:VCARD",
  "outputName": "jean-dupont-vcard"
}
```

## Limitations
- PNG uniquement (pas SVG, pas EPS).
- Data max ~2900 alphanumériques (limite QR v40).

## Troubleshooting
- `qrcode not installed` → vérifier Dockerfile.
- `data_too_long` → réduire la taille des données ou passer en errorCorrection=L.
