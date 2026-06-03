const { utils } = require('./utils');

module.exports = {
  async yousign_signature_request_delete(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const id = String(d.signature_request_id || '').trim();
      if (!id) return { ok: false, error: "L'ID de la demande est requis." };
  
      const permanent = d.permanent_delete === true || d.permanent_delete === 'true' ? '?permanent_delete=true' : '';
      log('Suppression en cours...');
      const res = await utils.yousignRequest(opts, 'DELETE', `/signature_requests/${encodeURIComponent(id)}${permanent}`);
      if (!res.ok) return res;
      return { ok: true, deleted: true, id };
    }
};
