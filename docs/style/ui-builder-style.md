# UI Builder — Style Guide (Classes, States, Breakpoints)

Date: 2025-08-18

This guide describes styling conventions inside the UI Builder: how to create and use classes, manage state and breakpoints, and decide between classes vs inline styles. It complements docs/backend/ui-builder-blueprint.md.


## Principles

- Reusability first: prefer classes for any style reused on 2+ elements.
- Explicit combos: when a visual style results from combining roles, create combo classes (`.btn.primary`) rather than duplicating properties.
- Predictable overrides: use state (base/hover/active/focus) and breakpoint-specific overrides to avoid inline ad-hoc tweaks.
- Accessibility: ensure focus styles exist and are visible; maintain adequate contrast (see Design System).


## Classes and Combos

- Single class: `.btn`, `.title`, `.card` define base roles.
- Combo class naming: `role.variant[.size]` (e.g., `btn.primary.small`).
- Keep names semantic (intent), not presentational (`.text-blue-500` belongs to tokens or utility layer, not here).

Examples:
```
.btn              // base button
.btn.primary      // semantic variant
.btn.primary.small // size modifier
.title.primary    // title with primary color
```

Combo resolution follows: individual classes apply first, then combo classes of matching parts override specific properties.


## State Management

States supported: `base`, `hover`, `active`, `focus`.

- Define minimal `base` styles; add specific deltas under each state.
- Always provide `focus` visible styles for interactive elements.

Example:
```
Class: btn
base:  { base: { background: 'var(--btn-bg)', color: 'var(--btn-fg)' } }
hover: { base: { filter: 'brightness(1.05)' } }
active:{ base: { transform: 'translateY(1px)' } }
focus: { base: { outline: '2px solid var(--focus)' } }
```


## Breakpoints

Default breakpoints: xs, sm, md, lg, xl. See ui-builder-blueprint for exact ranges.

- Use `base` for mobile-first; override in specific breakpoints.
- Keep responsive overrides minimal and scoped (e.g., typography scale, spacing changes).

Example:
```
Class: grid
base: { base: { display: 'grid', gridTemplateColumns: '1fr' } }
base.bp.md: { gridTemplateColumns: '1fr 1fr' }
base.bp.lg: { gridTemplateColumns: '1fr 1fr 1fr' }
```


## Choosing Classes vs Inline Styles

- Classes: reusable, semantic, override-friendly. Prefer for colors, typography, spacing, layout.
- Inline (`node.style/styleBp`): one-off tweaks, content-specific adjustments (e.g., a unique hero image height).
- If inline repeats, extract into a class.


## Tokens and Theming

- Use CSS custom properties (tokens) for colors/spacing/typography: `var(--color-primary)`, `var(--space-3)`, `var(--radius-md)`, etc.
- Define tokens globally (see Design System) and reference them in class styles and inline tweaks.
- Avoid hardcoded color hexes; prefer semantic tokens.


## Accessibility and Motion

- Respect prefers-reduced-motion: avoid large transitions; use small durations (80–160ms) for hover/active.
- Ensure clickable targets are at least 44x44 px on touch.
- Maintain color contrast (WCAG AA). See Design System contrast tokens.


## Naming Conventions

- Lowercase kebab or dot-delimited for combos: `btn.primary`, `card.outlined`.
- Avoid deep hierarchies; prefer combining 2–3 parts.
- Keep class lists short on nodes; rely on combos to express variants.


## Utilities (optional)

If needed, provide a small utility layer as classes (not Tailwind-level): `.flex`, `.items-center`, `.gap-2`, `.text-center`. Keep them minimal and prefer semantic classes.


## Review Checklist

- Are repeated inline styles extracted into classes?
- Do interactive elements have focus styles?
- Are breakpoints used sparingly and mobile-first?
- Are tokens used instead of hardcoded values?
- Are combos used to avoid duplication?

