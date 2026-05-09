// Mirror du helper API/src/utils/output-schema.js (cf. doc complète là-bas).
// Trois patterns : statique, dynamique-replace, dynamique-merge_at.

export interface OutputSchema {
  fields?: any[];
  ui?: any;
  title?: string;
  [k: string]: any;
}

export function resolveOutputSchema(
  tpl: any,
  context: any,
  staticSchema: OutputSchema | null | undefined,
): OutputSchema | null {
  const field = tpl?.output_schema_field;
  if (!field) return staticSchema || null;

  const dynamic = context?.[field];
  if (!dynamic || typeof dynamic !== 'object' || !Array.isArray(dynamic.fields)) {
    return staticSchema || null;
  }

  const mergeAt = tpl?.output_schema_merge_at;
  if (!mergeAt) return dynamic;

  if (!staticSchema || !Array.isArray(staticSchema.fields)) return dynamic;

  const merged: OutputSchema = JSON.parse(JSON.stringify(staticSchema));
  const target = (merged.fields || []).find((f: any) => f && f.key === mergeAt);
  if (!target) return dynamic;

  target.fields = (dynamic.fields || []).map((f: any) => ({ ...f }));
  if (target.type !== 'section' && target.type !== 'section_array') {
    target.type = 'section';
  }
  return merged;
}
