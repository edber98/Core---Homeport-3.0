# Flow Builder — Output Assist (bar + plus) and Vflow Anchor

Context
- We render a small “assist” (a short bar + a + button) next to free output handles to add nodes quickly.
- Vflow computes connection anchors from the bounding box (bbox) of the handle template. Any extra SVG/HTML around the circle can shift the bbox center and move the edge start away from the circle center.

Observed Problems
- On first drag after creating/switching/committing nodes (especially conditions), the assist may still be present in the handle template, causing Vflow to read a bbox larger than the circle and start paths off-center.
- iOS needed an extra tap in some flows where the assist was in the DOM at the wrong time.

Invariants and Solutions
- Never use foreignObject or position: absolute/relative near handles; only pure SVG inside the handle template.
- During pointerdown or hover on the circle, hide the assist immediately so bbox = circle only.
- Force a detectChanges() at pointerdown to ensure the assist is removed before Vflow computes the anchor.
- Use per-handle delayed activation after DOM-churning events so the first drag reads a clean bbox:
  - Node creation (palette or via +)
  - Orientation switch (vertical ↔ horizontal)
  - Node move (single/many)
  - Flow load (any source)
  - Condition outputs reconciliation (dialog commit / inspector JSON save)
  - Edge deletion (re-prime source handle so the assist reappears promptly)

APIs (in FlowBuilderComponent)
- isAssistReady(nodeId, handleId): boolean. Returns true only after a short per-handle delay (initialized on-demand). Use it in the template condition to show assist.
- primeAssistDelayForNode(nodeId, ms?): init assist delay for all outputs of a node.
- primeAssistDelayAllNodes(ms?): init assist delay for all nodes (e.g., after orientation switch or flow load).
- primeAssistForHandle(nodeId, handleId, ms?): re-enable assist quickly for a freed handle (e.g., after edge deletion).
- isConnectingFrom / isHoveringFrom: true while user is starting/hovering the handle; assist must be hidden (no animation) to preserve anchor.
- startAssistFade / isAssistFading: optional fade-out on non-drag scenarios (after connect/delete/commit). During drag/hover, never fade; hide instantly.

Template Rules (nodeHtml → outputs)
- Render the assist with pure SVG under this guard:
  (( !isOutputConnected(nodeId, out) && isAssistReady(nodeId, out) ) || isAssistFading(nodeId, out))
    && !isConnectingFrom(nodeId, out)
    && !isHoveringFrom(nodeId, out)

Notes
- Disappearance animation is allowed only on non-drag transitions; do not animate on hover/pointerdown to keep anchors perfect.
- Tooltip uses SVG <title> so no foreignObject is required. The title shows the output display name via getOutputName(model, handleId).

When to call the priming helpers
- After adding nodes: primeAssistDelayForNode(newId)
- After switching orientation: primeAssistDelayAllNodes(420)
- On node move: primeAssistDelayForNode(nodeId, 420) in onNodePositionChange/onNodesPositionMany
- On flow load: primeAssistDelayAllNodes(480) after assigning this.nodes
- On condition dialog commit or inspector JSON save (when outputs change): primeAssistDelayForNode(nodeId, 420)
- On edge removal: primeAssistForHandle(source, sourceHandle, 0) so + reappears right away

