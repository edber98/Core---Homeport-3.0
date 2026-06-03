---
name: kinn-connector-logo
description: 'Add or fix logos for Kinn/Homeport connectors in API/src/plugins/repos. Use when asked in French or English to put a logo on a connector, add connector branding, set iconUrl/color/iconClass, or requests like "mets un logo pour notion".'
---

# Kinn Connector Logo

Use this skill to add provider branding to an existing Kinn connector manifest.

Target file:

```text
API/src/plugins/repos/{connector}/manifest.json
```

## Required Pattern

Follow the same provider visual fields used by `notion`, `airtable`, and `anthropic`:

```json
{
  "key": "notion",
  "name": "Notion",
  "title": "Notion",
  "iconClass": "fa-solid fa-book",
  "iconUrl": "https://cdn.simpleicons.org/notion",
  "color": "#e2e2e2"
}
```

Keep the visual fields in this order immediately after `title`:

1. `iconClass`
2. `iconUrl`
3. `color`

Use `iconUrl` for the real product logo. Keep `iconClass` as a reasonable Font Awesome fallback that matches the product category.

## Workflow

1. Inspect the target connector manifest and the existing examples:

```bash
rg -n '"providers"|"iconClass"|"iconUrl"|"color"' API/src/plugins/repos/{connector}/manifest.json API/src/plugins/repos/notion/manifest.json API/src/plugins/repos/airtable/manifest.json API/src/plugins/repos/anthropic/manifest.json
```

2. Choose a stable logo URL:
   - Prefer an existing official or CDN logo already used elsewhere in the repo.
   - Prefer `https://cdn.simpleicons.org/{slug}` for Simple Icons logos when the service exists there.
   - Use a stable PNG/SVG CDN only when Simple Icons is missing or a colored product logo is needed.
   - Avoid hotlinking random web images with unstable query strings.

3. Choose `color` as a light background derived from the logo:
   - The background must be lighter than the dominant logo color.
   - For black or grayscale logos, use a light neutral such as `#e2e2e2` or `#f2f2f2`.
   - For colored logos, use a pale tint of the dominant brand color.
   - If the logo is multicolor and no dominant color reads well, use a very light neutral such as `#f2f2f2`.

4. Update the manifest with the bundled script:

```bash
node .agents/skills/kinn-connector-logo/scripts/update-connector-logo.js {connector} \
  --icon-url "https://cdn.simpleicons.org/notion" \
  --icon-class "fa-solid fa-book" \
  --logo-color "#000000"
```

Pass `--color "#e2e2e2"` when you want an exact background value. If both `--logo-color` and `--color` are passed, the script verifies that `color` is lighter than `logo-color`.

5. Validate the result:

```bash
node -e "JSON.parse(require('fs').readFileSync('API/src/plugins/repos/{connector}/manifest.json','utf8')); console.log('manifest ok')"
rg -n '"iconClass"|"iconUrl"|"color"' API/src/plugins/repos/{connector}/manifest.json
```

## Examples

Reproduce the existing Notion style:

```bash
node .agents/skills/kinn-connector-logo/scripts/update-connector-logo.js notion \
  --icon-url "https://cdn.simpleicons.org/notion" \
  --icon-class "fa-solid fa-book" \
  --logo-color "#000000" \
  --color "#e2e2e2"
```

Reproduce the existing Airtable style:

```bash
node .agents/skills/kinn-connector-logo/scripts/update-connector-logo.js airtable \
  --icon-url "https://cdn.iconscout.com/icon/free/png-256/free-airtable-logo-icon-svg-download-png-1254387.png" \
  --icon-class "fa-solid fa-table-cells" \
  --color "#f2f2f2"
```

Reproduce the existing Anthropic style:

```bash
node .agents/skills/kinn-connector-logo/scripts/update-connector-logo.js anthropic \
  --icon-url "https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/claude-color.png" \
  --icon-class "fa-solid fa-brain" \
  --color "#ffd3c5"
```
