const { utils } = require('./utils');

module.exports = {
  async activecampaign_branding_update_branding_updateexistingresource(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/brandings/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.branding_groupid !== undefined && d.branding_groupid !== null && d.branding_groupid !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["groupid"] = d.branding_groupid;
        }
    if (d.branding_sitename !== undefined && d.branding_sitename !== null && d.branding_sitename !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["sitename"] = d.branding_sitename;
        }
    if (d.branding_sitelogo !== undefined && d.branding_sitelogo !== null && d.branding_sitelogo !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["sitelogo"] = d.branding_sitelogo;
        }
    if (d.branding_sitelogosmall !== undefined && d.branding_sitelogosmall !== null && d.branding_sitelogosmall !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["sitelogosmall"] = d.branding_sitelogosmall;
        }
    if (d.branding_headertextvalue !== undefined && d.branding_headertextvalue !== null && d.branding_headertextvalue !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["headertextvalue"] = d.branding_headertextvalue;
        }
    if (d.branding_headerhtmlvalue !== undefined && d.branding_headerhtmlvalue !== null && d.branding_headerhtmlvalue !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["headerhtmlvalue"] = d.branding_headerhtmlvalue;
        }
    if (d.branding_footertextvalue !== undefined && d.branding_footertextvalue !== null && d.branding_footertextvalue !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["footertextvalue"] = d.branding_footertextvalue;
        }
    if (d.branding_footerhtmlvalue !== undefined && d.branding_footerhtmlvalue !== null && d.branding_footerhtmlvalue !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["footerhtmlvalue"] = d.branding_footerhtmlvalue;
        }
    if (d.branding_copyright !== undefined && d.branding_copyright !== null && d.branding_copyright !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["copyright"] = d.branding_copyright;
        }
    if (d.branding_version !== undefined && d.branding_version !== null && d.branding_version !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["version"] = d.branding_version;
        }
    if (d.branding_license !== undefined && d.branding_license !== null && d.branding_license !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["license"] = d.branding_license;
        }
    if (d.branding_links !== undefined && d.branding_links !== null && d.branding_links !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["links"] = d.branding_links;
        }
    if (d.branding_help !== undefined && d.branding_help !== null && d.branding_help !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["help"] = d.branding_help;
        }
    if (d.branding_admintemplatehtm !== undefined && d.branding_admintemplatehtm !== null && d.branding_admintemplatehtm !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["admintemplatehtm"] = d.branding_admintemplatehtm;
        }
    if (d.branding_admintemplatecss !== undefined && d.branding_admintemplatecss !== null && d.branding_admintemplatecss !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["admintemplatecss"] = d.branding_admintemplatecss;
        }
    if (d.branding_publictemplatehtm !== undefined && d.branding_publictemplatehtm !== null && d.branding_publictemplatehtm !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["publictemplatehtm"] = d.branding_publictemplatehtm;
        }
    if (d.branding_publictemplatecss !== undefined && d.branding_publictemplatecss !== null && d.branding_publictemplatecss !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["publictemplatecss"] = d.branding_publictemplatecss;
        }
    if (d.branding_favicon !== undefined && d.branding_favicon !== null && d.branding_favicon !== "") {
          if (!body["branding"] || typeof body["branding"] !== 'object' || Array.isArray(body["branding"])) body["branding"] = {};
          body["branding"]["favicon"] = d.branding_favicon;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body: requestBody });
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
