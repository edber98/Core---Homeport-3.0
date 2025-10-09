# Design System — Colors, Typography, Spacing, Tokens

Date: 2025-08-18

This document specifies the general visual style used across the app (Angular + UI Builder): color palette, typography scale, spacing, radii, shadows, and the token naming system. It also explains how NG Zorro theming integrates.


## Token Naming

Tokens are CSS custom properties defined on `:root` and consumed everywhere (components, UI Builder classes, inline styles).

- Color tokens: `--color-{role}[-{variant}]`
  - Examples: `--color-primary`, `--color-primary-contrast`, `--color-bg`, `--color-surface`, `--color-border`, `--color-success`, `--color-warning`, `--color-danger`.
- Spacing tokens: `--space-{n}` with a geometric scale (e.g., 0..8)
  - Examples: `--space-0: 0px; --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px;`
- Radius tokens: `--radius-{sm|md|lg|xl}`
- Shadow tokens: `--shadow-{sm|md|lg}`
- Typography tokens:
  - Font families: `--font-sans`, `--font-mono`
  - Font sizes: `--font-size-{xs|sm|md|lg|xl|2xl|3xl}` (mobile-first)
  - Line heights: `--line-{xs|sm|md|lg|xl}`
  - Weights: `--weight-{regular|medium|semibold|bold}`

Example root declaration:
```css
:root {
  /* Colors */
  --color-primary: #1677ff;
  --color-primary-contrast: #ffffff;
  --color-bg: #0b0c0e;            /* page background (dark) */
  --color-surface: #111317;       /* cards, panels */
  --color-border: #1f2329;
  --color-text: #e5e7eb;
  --color-muted: #9ca3af;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;

  /* Spacing */
  --space-0: 0px; --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px;

  /* Radius */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,.2);
  --shadow-md: 0 4px 8px rgba(0,0,0,.25);
  --shadow-lg: 0 10px 20px rgba(0,0,0,.3);

  /* Typography */
  --font-sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji';
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  --font-size-xs: 12px; --font-size-sm: 13px; --font-size-md: 14px; --font-size-lg: 16px; --font-size-xl: 18px; --font-size-2xl: 24px; --font-size-3xl: 32px;
  --line-xs: 16px; --line-sm: 18px; --line-md: 20px; --line-lg: 22px; --line-xl: 24px;
  --weight-regular: 400; --weight-medium: 500; --weight-semibold: 600; --weight-bold: 700;
}
```


## Semantic Roles

Use tokens to implement semantic roles in components and UI Builder classes:

- Primary interactive elements: background `--color-primary`, foreground `--color-primary-contrast`.
- Surfaces (cards/panels): background `--color-surface`, border `--color-border`, text `--color-text`.
- Muted/secondary text: `--color-muted`.
- Status: success/warning/danger.


## Typography Scale

Mobile-first scale with minor increments; use at most 4 sizes on a screen:

- Title: `--font-size-2xl` or `--font-size-3xl`
- Subtitle: `--font-size-xl`
- Body: `--font-size-md`/`--font-size-lg`
- Caption/Meta: `--font-size-sm`


## Spacing System

Apply spacing using the token scale, avoid ad-hoc pixel values. Common patterns:

- Section padding: `var(--space-6)` top/bottom
- Card padding: `var(--space-4)`
- Grid gaps: `var(--space-3)`/`var(--space-4)`


## Motion & Interaction

- Use small, consistent transitions (80–160ms) for hover/active/focus.
- Respect `prefers-reduced-motion` with CSS media query and avoid transform-heavy animations on mobile.


## NG Zorro Theming

Integrate with NG Zorro by mapping tokens to theme variables where possible:

- Set global colors via CSS variables in `styles.scss`.
- Override NG Zorro less variables if enabled in the build (optional) or rely on CSS variables to adjust components.
- Prefer composition (wrapping with classes) over deep theme overrides to keep upgrades simple.


## Dark/Light Modes (optional)

Define an alternate token set under `[data-theme="light"]` or `.theme-light` and toggle at the root. Keep the same token names so all components pick updated values automatically.


## Accessibility & Contrast

- Ensure text vs background contrast meets WCAG AA (4.5:1 for body, 3:1 for large text). Adjust `--color-text`/`--color-muted` accordingly.
- Focus indicators must be visible on all interactive components.


## Example Usage in UI Builder Class

```
Class: card
base: { base: {
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-sm)',
  padding: 'var(--space-4)'
}}
hover: { base: { boxShadow: 'var(--shadow-md)' } }
```

