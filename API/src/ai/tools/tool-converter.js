// Convert DynamicForm args schema → JSON Schema for LLM tool descriptions

function flattenFields(fields) {
  const out = [];
  for (const f of (fields || [])) {
    if (!f) continue;
    if (f.type === 'section' || f.type === 'section_array') {
      out.push(...flattenFields(f.fields));
    } else {
      out.push(f);
    }
  }
  return out;
}

function hasRequiredValidator(field) {
  if (field.required) return true;
  const validators = Array.isArray(field.validators) ? field.validators : [];
  return validators.some(v => v && (v.type === 'required' || v.kind === 'required'));
}

function fieldToJsonSchema(field) {
  const schema = {};
  const desc = field.label || field.title || field.description || '';
  if (desc) schema.description = desc;

  switch (field.type) {
    case 'number':
    case 'rate':
    case 'tel':
      schema.type = 'number';
      break;
    case 'checkbox':
    case 'boolean':
      schema.type = 'boolean';
      break;
    case 'select':
    case 'radio':
      schema.type = 'string';
      if (Array.isArray(field.options) && field.options.length) {
        schema.enum = field.options.map(o => o.value ?? o);
        if (desc) {
          const labels = field.options.map(o => `${o.value ?? o}: ${o.label || o}`).join(', ');
          schema.description = `${desc} (${labels})`;
        }
      }
      break;
    case 'tags':
    case 'text_array':
      schema.type = 'array';
      schema.items = { type: 'string' };
      break;
    case 'json':
    case 'schema_builder':
      schema.type = 'object';
      break;
    case 'section_array':
      schema.type = 'array';
      schema.items = { type: 'object' };
      break;
    case 'date':
      schema.type = 'string';
      schema.format = 'date';
      break;
    case 'file':
      schema.type = 'string';
      schema.description = (schema.description || field.label || '') +
        ' (ID de fichier fileId, ou URL. Utiliser un fileId obtenu d\'un résultat de tool ou d\'un attachment utilisateur)';
      break;
    default:
      schema.type = 'string';
  }

  if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '') {
    schema.default = field.defaultValue;
  }

  return schema;
}

function argsToJsonSchema(args) {
  const properties = {};
  const required = [];
  const allFields = [];

  // Handle both { fields: [...] } and { steps: [{ fields: [...] }] }
  if (Array.isArray(args?.fields)) {
    allFields.push(...flattenFields(args.fields));
  }
  if (Array.isArray(args?.steps)) {
    for (const step of args.steps) {
      allFields.push(...flattenFields(step.fields || []));
    }
  }

  for (const f of allFields) {
    if (!f.key) continue;
    properties[f.key] = fieldToJsonSchema(f);
    if (hasRequiredValidator(f)) required.push(f.key);
  }

  return { type: 'object', properties, ...(required.length ? { required } : {}) };
}

function extractOutputSchema(template) {
  // 1. outputHandles[0].schema
  if (Array.isArray(template.outputHandles) && template.outputHandles.length) {
    const handle = template.outputHandles[0];
    if (handle.schema) return handle.schema;
  }
  // 2. outputSchema (multi-output fallback)
  if (Array.isArray(template.outputSchema) && template.outputSchema.length) {
    return template.outputSchema;
  }
  // 3. output_schema_field → dynamic
  if (template.output_schema_field) {
    return { dynamic: true, field: template.output_schema_field };
  }
  return null;
}

module.exports = { argsToJsonSchema, extractOutputSchema, flattenFields, fieldToJsonSchema };
