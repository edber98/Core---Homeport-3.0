const Ajv = require('ajv');

exports.key = 'core_validator';
exports.run = async (_node, _msg, inputs) => {
  const ctx = _node?.data?.model?.context || {};
  const schema = parseJson(ctx.schema, {});
  const strict = !!ctx.strict;
  const ajv = new Ajv({ allErrors: strict });
  const validate = ajv.compile(schema);
  const ok = validate(inputs);
  if (!ok) {
    const errs = (validate.errors || []).map(e => `${e.instancePath || '/'} ${e.message}`).join('; ');
    const err = new Error(`Validation failed: ${errs}`); err.code = 'validation_failed'; throw err;
  }
  return inputs;
};

function parseJson(s, d){ try { if (!s) return d; return typeof s === 'string' ? JSON.parse(s) : s; } catch { return d; } }

