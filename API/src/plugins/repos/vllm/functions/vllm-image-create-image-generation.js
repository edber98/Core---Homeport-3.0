const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "prompt",
    "type": "text",
    "bodyPath": [
      "prompt"
    ]
  },
  {
    "key": "background",
    "type": "text",
    "bodyPath": [
      "background"
    ]
  },
  {
    "key": "model",
    "type": "text",
    "bodyPath": [
      "model"
    ]
  },
  {
    "key": "moderation",
    "type": "text",
    "bodyPath": [
      "moderation"
    ]
  },
  {
    "key": "n",
    "type": "number",
    "bodyPath": [
      "n"
    ]
  },
  {
    "key": "output_compression",
    "type": "number",
    "bodyPath": [
      "output_compression"
    ]
  },
  {
    "key": "output_format",
    "type": "text",
    "bodyPath": [
      "output_format"
    ]
  },
  {
    "key": "quality",
    "type": "text",
    "bodyPath": [
      "quality"
    ]
  },
  {
    "key": "response_format",
    "type": "text",
    "bodyPath": [
      "response_format"
    ]
  },
  {
    "key": "size",
    "type": "text",
    "bodyPath": [
      "size"
    ]
  },
  {
    "key": "user",
    "type": "text",
    "bodyPath": [
      "user"
    ]
  }
];

module.exports = {
  async vllm_image_create_image_generation(node, msg, inputs, opts) {
    const d = inputs || {};
    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else { try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; } }
    }
    const res = await utils.providerRequest(opts, '/v1/images/generations', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.created || '', status: 'generated', raw: r };
  }
};
