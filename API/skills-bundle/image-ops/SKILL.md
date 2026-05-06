---
name: image-ops
description: Opérations image via Pillow (resize, crop, format convert, watermark texte, thumbnail).
runtime: python
entrypoint: /app/skills-bundle/image-ops/ops.py
version: 1.0.0
license: MIT
mimeType: image/png
outputExt: png
tools: [skill_execute]
tags: [image, pillow, resize, watermark]
timeoutMs: 30000
requiresInput: true
---

# image-ops — Manipulation d'images

## Quand utiliser
Redimensionner, convertir de format (PNG↔JPG↔WEBP), ajouter un watermark texte, recadrer, créer une miniature.

Le fichier source doit être fourni dans `files:[{path, fileId}]`.

## Schéma d'entrée (stdin)
```json
{
  "action": "resize" | "convert" | "crop" | "thumbnail" | "watermark",
  "source": "photo.jpg",
  "outputName": "photo-web",
  "outputFormat": "png" | "jpg" | "webp",

  "width": 800,          "height": 600,
  "crop":   {"x": 10, "y": 10, "width": 400, "height": 300},
  "thumbnail": {"maxSize": 256},
  "watermark": {"text": "© 2026", "position": "bottom-right",
                "fontSize": 24, "color": "#FFFFFF", "opacity": 0.7}
}
```

### Actions
- `resize` : redimensionne à `width`x`height`. Si un seul est donné, conserve ratio.
- `convert` : conversion de format uniquement (selon `outputFormat`).
- `crop` : découpe `{x,y,width,height}`.
- `thumbnail` : produit une miniature contenue dans un carré `maxSize`.
- `watermark` : ajoute un texte sur l'image. Position : `bottom-right` (défaut), `bottom-left`, `top-right`, `top-left`, `center`.

## Exemple — Miniature 256px JPG
```json
{
  "action": "thumbnail",
  "source": "original.png",
  "thumbnail": {"maxSize": 256},
  "outputFormat": "jpg",
  "outputName": "thumbnail"
}
```

## Exemple — Watermark
```json
{
  "action": "watermark",
  "source": "diapo.png",
  "watermark": {"text": "CONFIDENTIEL", "position": "center", "fontSize": 48, "color": "#FF0000", "opacity": 0.3},
  "outputName": "diapo-confidentiel"
}
```

## Limitations
- Watermark texte uniquement (pas d'image overlay).
- Police système par défaut (Pillow default) — pas de font custom.
- Taille sortie plafonnée à 50 MB.

## Troubleshooting
- `Pillow not installed` → vérifier Dockerfile.
- `source_not_found:X` → fichier pas stagé.
- `invalid_format:X` → formats supportés : png, jpg/jpeg, webp, gif, bmp.
