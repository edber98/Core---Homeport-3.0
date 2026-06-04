const { utils } = require('./utils');

module.exports = {
  async chromadb_generic_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const action = String(d.action || '').trim();
    if (!action) return { ok: false, error: 'action requis.' };

    const builtPayload = utils.buildObjectFromFields(d.requestFields);
    if (!builtPayload.ok) return builtPayload;
    const payload = builtPayload.object || {};

    return utils.run(action, payload, opts);
  }
};
