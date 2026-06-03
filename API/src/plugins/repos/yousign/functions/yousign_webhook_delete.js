const { utils } = require('./utils');

module.exports = {
  async yousign_webhook_delete(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const id = String(d.webhook_id || '').trim();
      if (!id) return { ok: false, error: "L'ID du webhook est requis." };
  
      log('Suppression en cours...');
      const res = await utils.yousignRequest(opts, 'DELETE', `/webhooks/${encodeURIComponent(id)}`);
      if (!res.ok) return res;
      return { ok: true, deleted: true, id };
    }
};
