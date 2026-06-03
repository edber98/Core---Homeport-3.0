const { utils } = require('./utils');

module.exports = {
  async chromadb_generic_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const action = String(d.action || '').trim();
    if (!action) return { ok: false, error: 'action requis.' };

    let payload = {};
    if (d.payload !== undefined && d.payload !== null && d.payload !== '') {
      if (typeof d.payload === 'object') payload = d.payload;
      else {
        try { payload = JSON.parse(String(d.payload)); } catch { return { ok: false, error: 'JSON invalide dans payload.' }; }
      }
    }

    return utils.run(action, payload, opts);
  }
};
