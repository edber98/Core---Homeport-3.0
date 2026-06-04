const { utils } = require('./utils');

module.exports = {
  async front_event_trigger_trigger_app_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/applications/{application_uid}/events";
    const application_uid = String(d.application_uid || '').trim();
    if (!application_uid) return { ok: false, error: 'application_uid requis.' };
    reqPath = reqPath.replace('{application_uid}', encodeURIComponent(application_uid));

    const query = {};

    const headers = {};

    const body = {};
    if (d.event_type !== undefined && d.event_type !== null && d.event_type !== '') {
      body["event_type"] = d.event_type;
    }
    if (d.app_object !== undefined && d.app_object !== null && d.app_object !== '') {
      body["app_object"] = d.app_object;
    }
    if (d.app_object_id !== undefined && d.app_object_id !== null && d.app_object_id !== '') {
      if (!body["app_object"] || typeof body["app_object"] !== 'object' || Array.isArray(body["app_object"])) body["app_object"] = {};
      body["app_object"]["id"] = d.app_object_id;
    }
    if (d.app_object_ext_link !== undefined && d.app_object_ext_link !== null && d.app_object_ext_link !== '') {
      if (!body["app_object"] || typeof body["app_object"] !== 'object' || Array.isArray(body["app_object"])) body["app_object"] = {};
      body["app_object"]["ext_link"] = d.app_object_ext_link;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

