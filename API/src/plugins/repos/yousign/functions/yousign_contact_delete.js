const { utils } = require('./utils');

module.exports = {
  async yousign_contact_delete(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const id = String(d.contact_id || '').trim();
      if (!id) return { ok: false, error: "L'ID du contact est requis." };
  
      log('Suppression en cours...');
      const res = await utils.yousignRequest(opts, 'DELETE', `/contacts/${encodeURIComponent(id)}`);
      if (!res.ok) return res;
      return { ok: true, deleted: true, id };
    }
};
