# Homeport Flow Routing — Backward-Aware Orthogonal Router (ngx-vflow)

This document describes the custom edge routing used in the Flow Builder, the constraints it satisfies, and how auto‑layout should treat backward edges.

## Goals

- Never cross nodes (obstacle avoidance).
- Minimize edge crossings; prefer clean detours to cutting across edges.
- Favor long straight segments; few bends; rounded corners at bends.
- Directional logic:
  - Horizontal backward: right → left.
  - Vertical backward: bottom → top.
  - Forward edges remain Bezier.
- During drag: allow crossing the hovered node only; otherwise never cross nodes.
- Auto‑layout must ignore backward edges (they should not influence node placement).
 - Auto‑layout must also ignore Loop "Each" branch edges so branch wiring does not distort placement.

## Router Overview

File: `src/app/features/flow/edge-curves.ts` exports `backAwareCurve` (an `ngx-vflow` CurveFactory):

- Forward edges: Bezier path with stable label sampling points.
- Backward edges: Orthogonal path with rounded corners (quadratic curves, radius 6), computed via a sparse‑grid A* router with penalties.

### Backward Detection

- Decide axis per edge:
  - If both ports are horizontal → axis = horizontal.
  - If both ports are vertical → axis = vertical.
  - Otherwise, dominant delta: `abs(dx) >= abs(dy)` → horizontal; else vertical.
- Backward when:
  - Horizontal: `sx > tx` (right → left).
  - Vertical: `sy > ty` (bottom → top).

### Obstacles

- Each node is an inflated rectangle (padding ≈ 18px) to keep edges at a safe distance from nodes.
- During drag (connection preview): if the cursor is over a node (targetPoint lies inside a node’s base rect), that specific node is temporarily removed from obstacles so the preview can pass through it. All other nodes remain obstacles.

### Sparse Grid

- Use only “interesting” X/Y coordinates to create a sparse orthogonal graph:
  - `sx, tx, sx ± exit, tx ± entry` and similarly for Y.
  - For each obstacle: `left/right ± gap`, `top/bottom ± gap`.
- Typical grid: tens to a couple hundred grid points → very fast A*.

### Cost Function (A*)

- Base: Manhattan edge length.
- Turns: +250 per change of direction.
- Reverse direction: +10000 when moving against the backward direction (horizontal: moving right; vertical: moving down).
- Crossings: +600 per intersection with precomputed “edge corridor” segments (approximate paths of visible edges).

### Horizontal Backward (Right → Left)

- Enforce initial exit to the right beyond the source node’s right edge by a lane gap (≈ 28px) before routing left.
- Run A* with the above costs on the sparse grid; fallback to simple orthogonal detours if necessary.

### Vertical Backward (Bottom → Top)

- Always depart to the right:
  - Compute a right‑side “lane” X: `laneX = max(sourceRect.right, targetRect.right) + laneGap`.
  - Pre‑seed the path: S → (S.x, yOut) [outside source vertically] → (laneX, yOut).
  - Route from that lane point to target entry via A*.
- While routing, heavily penalize segments that go left of `laneX`, so the path stays on the right unless strictly impossible.

### Rounded Corners

- Corner smoothing uses quadratic segments with a small radius (~6px) while preserving orthogonality and label points along the rounded polyline.

## Integration

- Flow Builder wiring:
  - `flow-builder.component.ts` sets `connectionSettings.curve = backAwareCurve`.
  - New edges (connect/auto‑connect) include `curve: backAwareCurve`.
  - Rendered edges are mapped to include `curve: backAwareCurve` for consistent behavior.
  - The connection template draws the preview (`ctx.path()`) with a marker, so drag paths are visible.

## Auto‑layout (API)

- Client sends hints to the layout API. When a Loop→Each branch is present and the builder ports are horizontal, the client forces ELK orientation to `vertical` with meta hints to improve branch placement:
  - Orientation override: `orientation='vertical'` when an `Each` edge exists; otherwise use the builder orientation.
  - Meta hints: `{ preferVerticalForEach: true, eachLane: 'right', afterPlacement: 'below', outputBias: 'bottom-right' }`.
  - These hints encode the desired behavior: after an `Each` branch in horizontal UI, the downstream placement should favor the right lane and place the `After` path below, following the bottom‑right output bias of loop nodes.
- Backend guidance: honor the `orientation` override and `meta` hints to steer the ELK configuration (e.g., rankdir=TB for vertical, lane constraints for Each, and bias to place `After` below the loop block).

## Parameters (tunable)

- `RADIUS = 6`: rounding at corners.
- `NODE_PADDING = 18`: inflated node clearance.
- `GRID_GAP = 28`: sampling distance from obstacle boundaries.
- `EXIT = 26`, `ENTRY = 18`: port exit/entry distances.
- `LANE_GAP = 28`: minimum right‑lane distance beyond node edge (backward cases).
- Cost weights: `TURN=250`, `REVERSE=10000`, `CROSS=600`.

## Debugging

- Console logs indicate backward mode entry (`[router] mode=h-back|v-back`).
- Candidate overlays for drag can be reintroduced if needed, but are off by default.

## Invariants

- Never cross nodes, except during drag while hovering that specific node.
- Prefer straight segments; keep bend count low; rounded corners for aesthetics.
- Horizontal backward: exit right before routing left.
- Vertical backward: always depart to the right and stay on the right‑side lane.
- Auto‑layout ignores backward edges entirely in its graph model.
