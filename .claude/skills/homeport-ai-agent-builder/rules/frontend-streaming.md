# Frontend SSE temps réel

## Flux principal

```
ai.service.ts                     ai-chat.component.ts
═══════════════                   ═════════════════════
quickSend(text)
  → fetch POST /api/ai/threads/:id/messages
  → TextDecoder stream
  → parse SSE lines                processStreamEvent(ev)
  → Observable<AiStreamEvent>        → segments[] (immutable updates)
    ├─ message → text                  ├─ { type: 'text', rawText, html }
    ├─ tool.start → tag               ├─ { type: 'tools', tools[], reasoning? }
    ├─ tool.input_delta → preview     │    └─ text absorption → reasoning block
    ├─ tool.end → tag update          │
    ├─ thinking → iteration           │
    ├─ question → pendingQuestion     │
    ├─ patch/snapshot/args/desc       │
    │   → ai.sideEvents$ Subject     ↓
    └─ done → cleanup              segments = []
```

## SSE via fetch POST

Le frontend utilise un `fetch POST` natif (pas EventSource, car il faut un body) :

```typescript
// ai.service.ts (simplifié)
async quickSend(text: string) {
  const body = { content: text, pageContext: this.getPageContext() };

  const res = await fetch(`/api/ai/threads/${threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Parse SSE lines
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const event = JSON.parse(line.slice(6));
      // Emit to Observable
      subject.next(event);
    }
  }
}
```

## Segments system

Les messages en streaming sont organisés en **segments** pour le rendu :

```typescript
interface StreamSegment {
  type: 'text' | 'tools';
  // type === 'text'
  rawText?: string;        // Texte brut Markdown
  html?: string;           // HTML rendu (marked + DOMPurify)
  // type === 'tools'
  tools?: StreamTool[];    // Liste des tool tags
  reasoningText?: string;  // Texte absorbé comme reasoning
  reasoningHtml?: string;  // HTML du reasoning
}

interface StreamTool {
  id: string;
  name: string;
  status: 'running' | 'success' | 'error';
  duration?: number;       // ms
  args?: any;              // Arguments de l'appel
  result?: any;            // Résultat
  inputJson?: string;      // JSON partiel en streaming
}
```

### Cycle de vie des segments

```
1. message → Crée/étend un segment 'text'
2. tool.start → Crée un segment 'tools' (absorbe le texte précédent comme reasoning)
3. tool.input_delta → Accumule le JSON partiel sur le tool running
4. tool.end → Met à jour le status du tool
5. message (après tools) → Nouveau segment 'text'
6. Résultat : [text, tools+reasoning, text, tools+reasoning, text]
```

### Text-before-tools absorption (reasoning blocks)

Quand un `tool.start` arrive après du texte, ce texte est **absorbé** comme "reasoning" :

```typescript
case 'tool.start': {
  const last = this.segments[this.segments.length - 1];
  if (last && last.type === 'text') {
    // Absorbe le texte précédent comme reasoning
    const newSeg: StreamSegment = {
      type: 'tools',
      tools: [tool],
      reasoningText: last.rawText,
      reasoningHtml: this.renderMd(last.rawText),
    };
    this.segments = [...this.segments.slice(0, -1), newSeg];
  } else {
    this.segments = [...this.segments, { type: 'tools', tools: [tool] }];
  }
}
```

Le reasoning est affiché dans un bloc avec bordure gauche violette, collapsible.

## Tool tags

Chaque outil en cours ou terminé est affiché comme un **nz-tag** avec popover :

### Running (en cours)
```html
<nz-tag nzColor="default">
  <span nz-icon nzType="loading" nzSpin></span>
  {{ toolLabel(t.name) }}
</nz-tag>
```

### Success
```html
<nz-tag nzColor="geekblue">
  <span nz-icon nzType="check-circle"></span>
  {{ toolLabel(t.name) }}
  <span class="tag-dur">{{ t.duration }}ms</span>
</nz-tag>
```

### Error
```html
<nz-tag nzColor="red">
  <span nz-icon nzType="close-circle"></span>
  {{ toolLabel(t.name) }}
</nz-tag>
```

### Popover (au clic/hover)

Affiche les args JSON et le résultat JSON :

```html
<nz-popover>
  <div class="popover-section">
    <div class="popover-label">Arguments</div>
    <pre>{{ truncJson(t.args) }}</pre>
  </div>
  <div class="popover-section">
    <div class="popover-label">Résultat</div>
    <pre>{{ truncJson(t.result) }}</pre>
  </div>
</nz-popover>
```

### Tool labels

Les noms techniques sont traduits en labels lisibles via `TOOL_LABELS` map.

### Tool extras

Informations contextuelles affichées à côté du tag :

```typescript
toolExtra(t: StreamTool): string {
  if (t.name === 'execute_tool' && t.args.key) return t.args.key;
  if (t.name === 'search_tools' && t.args.query) return `"${t.args.query}"`;
  if (t.name === 'add_node' && t.args.templateKey) return t.args.templateKey;
  // etc.
}
```

## Tool input streaming

Pendant qu'un outil reçoit ses arguments (tool_input_delta), un aperçu formaté est affiché :

```typescript
formatToolStream(toolName: string, json?: string): string {
  // Parse complete JSON → format spécifique par outil
  // Parse incomplete JSON → extract partial key-values via regex
  switch (toolName) {
    case 'ask_user':
      // Affiche question + options en formation
    case 'execute_tool':
      // Affiche key + args preview
    case 'set_node_args':
      // Affiche nodeId + args preview
    default:
      // JSON formaté tronqué
  }
}
```

## Side events

Les events de type builder (patch, snapshot, args, desc, form.update) sont **forwardés** au service IA :

```typescript
// ai-chat.component.ts
case 'patch':
case 'snapshot':
case 'args':
case 'desc':
  this.ai.emitSideEvent(ev);
  break;

// + events form/flow
if (ev.type?.startsWith('form.') || ev.type?.startsWith('flow.')) {
  this.ai.emitSideEvent(ev);
}
```

Les builders (flow-builder, form-builder) s'abonnent à `ai.sideEvents$` :

```typescript
// Dans un builder component
this.ai.sideEvents$.subscribe(ev => {
  if (ev.type === 'patch') this.applyPatch(ev);
  if (ev.type === 'snapshot') this.replaceGraph(ev.graph);
  if (ev.type === 'args') this.applyArgs(ev.nodeId, ev.args);
  if (ev.type === 'desc') this.setDescription(ev.nodeId, ev.text);
});
```

## Thread management

Le service gère les threads avec :

- **Mode detection** : basé sur `pageContext` (flowId → workflow, formId → form, nodeId → node_args)
- **Linked elements** : un thread peut être lié à un flow ou form (affiché comme lien cliquable)
- **Auto-load** : le thread le plus récent pour le mode courant est chargé automatiquement
- **Transfer** : `compact_and_transfer` crée un nouveau thread → SSE event `thread.transfer` → auto-switch

## Immutabilité des segments

Les segments sont mis à jour de manière **immutable** pour forcer le change detection Angular :

```typescript
// Mauvais (mutation)
this.segments[i].tools.push(tool);

// Bon (immutable)
this.segments = [...this.segments.slice(0, -1), { ...last, tools: [...last.tools, tool] }];
```

Ceci est critique pour les performances : Angular Zone ne détecte pas les mutations de propriétés profondes.
