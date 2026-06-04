const { utils } = require('./utils');

module.exports = {
  async front_teammate_group_update_update_a_company_teammate_group(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/teammate_groups/{teammate_group_id}";
    const teammate_group_id = String(d.teammate_group_id || '').trim();
    if (!teammate_group_id) return { ok: false, error: 'teammate_group_id requis.' };
    reqPath = reqPath.replace('{teammate_group_id}', encodeURIComponent(teammate_group_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }
    if (d.permissions !== undefined && d.permissions !== null && d.permissions !== '') {
      body["permissions"] = d.permissions;
    }
    if (d.permissions_contacts !== undefined && d.permissions_contacts !== null && d.permissions_contacts !== '') {
      if (!body["permissions"] || typeof body["permissions"] !== 'object' || Array.isArray(body["permissions"])) body["permissions"] = {};
      body["permissions"]["contacts"] = d.permissions_contacts;
    }
    if (d.permissions_contacts_access !== undefined && d.permissions_contacts_access !== null && d.permissions_contacts_access !== '') {
      if (!body["permissions"] || typeof body["permissions"] !== 'object' || Array.isArray(body["permissions"])) body["permissions"] = {};
      if (!body["permissions"]["contacts"] || typeof body["permissions"]["contacts"] !== 'object' || Array.isArray(body["permissions"]["contacts"])) body["permissions"]["contacts"] = {};
      body["permissions"]["contacts"]["access"] = d.permissions_contacts_access;
    }
    if (d.permissions_contacts_contact_group_ids !== undefined && d.permissions_contacts_contact_group_ids !== null && d.permissions_contacts_contact_group_ids !== '') {
      if (!body["permissions"] || typeof body["permissions"] !== 'object' || Array.isArray(body["permissions"])) body["permissions"] = {};
      if (!body["permissions"]["contacts"] || typeof body["permissions"]["contacts"] !== 'object' || Array.isArray(body["permissions"]["contacts"])) body["permissions"]["contacts"] = {};
      body["permissions"]["contacts"]["contact_group_ids"] = d.permissions_contacts_contact_group_ids;
    }
    if (d.permissions_contacts_contact_list_ids !== undefined && d.permissions_contacts_contact_list_ids !== null && d.permissions_contacts_contact_list_ids !== '') {
      if (!body["permissions"] || typeof body["permissions"] !== 'object' || Array.isArray(body["permissions"])) body["permissions"] = {};
      if (!body["permissions"]["contacts"] || typeof body["permissions"]["contacts"] !== 'object' || Array.isArray(body["permissions"]["contacts"])) body["permissions"]["contacts"] = {};
      body["permissions"]["contacts"]["contact_list_ids"] = d.permissions_contacts_contact_list_ids;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};

