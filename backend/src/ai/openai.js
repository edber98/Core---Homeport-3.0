const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function callOpenAI(prompt){
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || process.env.OPENAI_KEY;
  if (!apiKey) throw new Error('missing_openai_key');
  console.log('[openai][call] model=%s promptLen=%d', DEFAULT_MODEL, (prompt||'').length);
  const body = {
    model: DEFAULT_MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]
  };
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });
  console.log('[openai][resp] status=%d', resp.status);
  if (!resp.ok) throw new Error(`openai_http_${resp.status}`);
  const json = await resp.json();
  const text = json?.choices?.[0]?.message?.content || '';
  console.log('[openai][content] len=%d', text.length);
  return text;
}

function parseAgentJson(text){
  try {
    if (!text) return { commentary: '', schema: null, steps: [] };
    // 1) Prefer fenced block ```json ... ```
    const fence = /```json([\s\S]*?)```/i.exec(text);
    if (fence && fence[1]) {
      return JSON.parse(fence[1]);
    }
    // 2) Try direct JSON
    try { return JSON.parse(text); } catch {}
    // 3) Heuristic: slice from first "{" to matching closing
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end >= start) {
      const chunk = text.slice(start, end + 1);
      try { return JSON.parse(chunk); } catch {}
    }
    return { commentary: text || '', schema: null, steps: [] };
  } catch (e) {
    return { commentary: text || '', schema: null, steps: [] };
  }
}

async function generatePlanAndSchema({ prompt }){
  const tpl = `
Tu es un concepteur expert de schémas Dynamic Form. Respecte STRICTEMENT ces règles et le format:
- Sortie STRICTEMENT JSON de la forme: { "commentary": string, "steps": string[], "schema": FormSchema }
- FormSchema:
  - title?: string
  - ui?: { layout: 'horizontal'|'vertical'|'inline'; labelsOnTop?: boolean; labelAlign?: 'left'|'right'; labelCol?: {span?}; controlCol?: {span?}; widthPx?: number }
  - fields?: FieldConfig[]  OR  steps?: StepConfig[] (mutuellement exclusifs)
  - summary?: { enabled: boolean; title?: string; includeHidden?: boolean; dateFormat?: string }
- StepConfig: { title: string; visibleIf?: Rule; fields?: FieldConfig[]; prevText?: string; nextText?: string }
- FieldConfig (inputs): { type: 'text'|'textarea'|'number'|'select'|'radio'|'checkbox'|'date'; key: string; label?: string; placeholder?: string; description?: string; options?: {label,value}[]; default?: any; validators?: Validator[]; visibleIf?: Rule; requiredIf?: Rule; disabledIf?: Rule; col?: {xs..xl}; itemStyle?: {}; secret?: boolean; expression?: { allow?: boolean; defaultMode?: 'val'|'expr' } }
- FieldConfig (sections): { type: 'section'|'section_array'; title?: string; description?: string; mode?: 'normal'|'array'; key?: string; array?: { initialItems?:number; minItems?:number; maxItems?:number; controls?:{add?:{kind?;text?}; remove?:{kind?;text?}}}; ui?: Partial<FormUI>; fields: FieldConfig[]; visibleIf?: Rule; col?: {xs..xl} }
- Validators: {type:'required'|'min'|'max'|'minLength'|'maxLength'|'pattern', value?:any}
- Rule JSON minimal (seulement): {"var":"fieldKey"}, {"not":X}, {"all":[...]}, {"any":[...]}, {"==":[A,B]}, {"!=":[A,B]}, {">":[A,B]}, {">=":[A,B]}, {"<":[A,B]}, {"<=":[A,B]}
- Sémantique: disabledIf et invisible neutralisent required. Les champs cachés/disabled ne bloquent pas la validation.
- Layout par défaut: ui.layout='vertical', ui.labelsOnTop=true. Regrouper en sections par thème; steps seulement si plusieurs sujets.
- Options: courtes et lisibles. Cols: col.xs=24 par défaut; adapter md/lg si besoin.
- Pas de HTML brut (sauf type=textblock si nécessaire, éviter en général).
Objectif: produire un schéma propre, logique, avec validators et conditions (visibleIf/requiredIf/disabledIf) pertinents.

EXEMPLES (format exact) — n'inclus PAS ces exemples dans la sortie finale:
1) Flat simple (fields):
{
  "title": "Contact",
  "ui": { "layout": "vertical", "labelsOnTop": true },
  "fields": [
    { "type": "text", "key": "name", "label": "Nom", "validators": [{"type":"required"}], "col": {"xs": 24} },
    { "type": "text", "key": "email", "label": "Email", "validators": [{"type":"required"}, {"type":"pattern","value":"^.+@.+\\..+$"}], "col": {"xs": 24} },
    { "type": "textarea", "key": "message", "label": "Message", "validators": [{"type":"minLength","value": 20}], "col": {"xs": 24} }
  ]
}
2) Section array (repeaters):
{
  "title": "Commande",
  "ui": { "layout": "vertical", "labelsOnTop": true },
  "fields": [
    {
      "type": "section",
      "title": "Client",
      "fields": [
        { "type": "text", "key": "firstName", "label": "Prénom", "validators": [{"type":"required"}] },
        { "type": "text", "key": "lastName", "label": "Nom", "validators": [{"type":"required"}] }
      ]
    },
    {
      "type": "section_array",
      "title": "Articles",
      "key": "items",
      "mode": "array",
      "array": { "initialItems": 1, "minItems": 1 },
      "fields": [
        { "type": "text", "key": "sku", "label": "SKU", "validators": [{"type":"required"}] },
        { "type": "number", "key": "qty", "label": "Qté", "validators": [{"type":"min","value":1}] }
      ]
    }
  ]
}
3) Steps + conditions:
{
  "title": "Inscription",
  "ui": { "layout": "vertical", "labelsOnTop": true },
  "steps": [
    { "title": "Profil", "fields": [
      { "type": "text", "key": "username", "label": "Identifiant", "validators": [{"type":"required"}] },
      { "type": "checkbox", "key": "pro", "label": "Compte professionnel", "default": false }
    ]},
    { "title": "Détails", "fields": [
      { "type": "text", "key": "company", "label": "Société", "visibleIf": {"==":[{"var":"pro"}, true]} },
      { "type": "text", "key": "siret", "label": "SIRET", "requiredIf": {"==":[{"var":"pro"}, true]}, "disabledIf": {"not":{"var":"pro"}} }
    ]}
  ]
}
`;
  const text = await callOpenAI(`${tpl}\n\nDemande utilisateur:\n${prompt}`);
  try {
    console.log('[openai][raw]', (text || '').slice(0, 800).replace(/\n/g,'\\n'));
  } catch {}
  const parsed = parseAgentJson(text);
  try { parsed._raw = text; } catch {}
  return parsed;
}

const SYSTEM_PROMPT = `Tu conçois des schémas de formulaire applicables dans un moteur Dynamic Form.\nContraintes:\n- Toujours produire du JSON STRICT valide. Aucune prose hors JSON dans la sortie finale.\n- Respecter les types autorisés, validators, et la grammaire des règles (visibleIf/requiredIf/disabledIf) minimale fournie.\n- Regrouper par sections; steps seulement si nécessaire.\n- UI par défaut vertical avec labelsOnTop.\n- Champs sensibles: pas de secrets générés.\n`;

module.exports = { generatePlanAndSchema };
