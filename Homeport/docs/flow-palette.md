# Flow Builder Palette and Grouping

This document explains how the Flow Builder palette is organized (groups, categories), how to add new items, and how icons and subtitles are displayed.

## Structure

- Groups: High-level sections in the palette such as `Core`, `Logic`, and `Functions`.
- Categories: Sub-groups under `Functions` (e.g. `Gmail`, `HTTP`, `Slack`, `Math`, `Text`, `Docs`).
- Items: Draggable cards displaying an icon, title, and subtitle.

The UI groups first by `group`, then (for `function`-type items) by `template.category`.

## Adding Items

Items are declared in `src/app/features/flow/flow-builder.component.ts` in the `items` array. Each item looks like this:

```
{
  group: 'Functions',
  label: 'HTTP Request',
  template: {
    id: 'tmpl_http',
    name: 'HTTP Request',
    type: 'function',
    icon: 'fa-solid fa-globe',
    title: 'HTTP Request',
    subtitle: 'Call API',
    category: 'HTTP',
    output: [],
    args: { /* Dynamic Form schema for the node */ }
  }
}
```

Important fields:
- `group`: Top-level grouping (e.g., `Core`, `Logic`, `Functions`).
- `template.type`: Determines behavior (`start`, `condition`, `loop`, `function`, etc.).
- `template.icon`: Font Awesome classes displayed in the card.
- `template.subtitle`: Secondary text below the item title.
- `template.category`: Used to sub-group function nodes under `Functions`.
- `template.args`: Dynamic Form schema bound to the node context in the advanced editor dialog.

## Icons and Subtitles

- The palette item shows `template.icon` and `template.subtitle`.
- Use Font Awesome class names in `template.icon` (e.g., `fa-solid fa-envelope`).

## Default Nodes

The initial graph is seeded from the palette items:
- First `start`-type item becomes the `Start` node.
- First `condition`-type item becomes the `Condition` node.
- Two first `function`-type items become example function nodes.

## Tips

- Keep `template.id` stable across changes.
- For `condition` nodes, outputs correspond to items within the array field (default `items`). Each item should have a stable `_id` for edge mapping.
- Use `args` schemas similar to existing ones to get a ready-to-use form in the advanced editor.

