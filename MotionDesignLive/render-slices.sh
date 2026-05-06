#!/usr/bin/env bash
# Render all 13 slices as individual MP4 files with built-in black fade-in / out.
# Run sequentially to avoid saturating the machine.
set -euo pipefail

OUT=out/slices
mkdir -p "$OUT"

SLICES=(
  "p00-origin"
  "p01-hook"
  "p02-workflow-concept"
  "p03-workflow-builder"
  "p04-bridge"
  "p05-agents"
  "p06-prompt-demo"
  "p07-sandbox"
  "p08-permissions"
  "p09-workflow-agentic"
  "p10-confidentiality"
  "p11-use-cases"
  "p12-closing"
)

for id in "${SLICES[@]}"; do
  echo "════════ Rendering $id ════════"
  npx remotion render "$id" "$OUT/$id.mp4"
done

echo "✓ All slices rendered to $OUT/"
ls -lh "$OUT/"
