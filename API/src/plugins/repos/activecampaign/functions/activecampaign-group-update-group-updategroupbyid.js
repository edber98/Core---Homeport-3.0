const { utils } = require('./utils');

module.exports = {
  async activecampaign_group_update_group_updategroupbyid(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/groups/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.group_title !== undefined && d.group_title !== null && d.group_title !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["title"] = d.group_title;
        }
    if (d.group_descript !== undefined && d.group_descript !== null && d.group_descript !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["descript"] = d.group_descript;
        }
    if (d.group_pgmessageadd !== undefined && d.group_pgmessageadd !== null && d.group_pgmessageadd !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgmessageadd"] = d.group_pgmessageadd;
        }
    if (d.group_unsubscribelink !== undefined && d.group_unsubscribelink !== null && d.group_unsubscribelink !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["unsubscribelink"] = d.group_unsubscribelink;
        }
    if (d.group_optinconfirm !== undefined && d.group_optinconfirm !== null && d.group_optinconfirm !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["optinconfirm"] = d.group_optinconfirm;
        }
    if (d.group_pglistadd !== undefined && d.group_pglistadd !== null && d.group_pglistadd !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pglistadd"] = d.group_pglistadd;
        }
    if (d.group_pglistedit !== undefined && d.group_pglistedit !== null && d.group_pglistedit !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pglistedit"] = d.group_pglistedit;
        }
    if (d.group_pglistdelete !== undefined && d.group_pglistdelete !== null && d.group_pglistdelete !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pglistdelete"] = d.group_pglistdelete;
        }
    if (d.group_pglistheaders !== undefined && d.group_pglistheaders !== null && d.group_pglistheaders !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pglistheaders"] = d.group_pglistheaders;
        }
    if (d.group_pglistemailaccount !== undefined && d.group_pglistemailaccount !== null && d.group_pglistemailaccount !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pglistemailaccount"] = d.group_pglistemailaccount;
        }
    if (d.group_pglistbounce !== undefined && d.group_pglistbounce !== null && d.group_pglistbounce !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pglistbounce"] = d.group_pglistbounce;
        }
    if (d.group_pgmessageedit !== undefined && d.group_pgmessageedit !== null && d.group_pgmessageedit !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgmessageedit"] = d.group_pgmessageedit;
        }
    if (d.group_pgmessagedelete !== undefined && d.group_pgmessagedelete !== null && d.group_pgmessagedelete !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgmessagedelete"] = d.group_pgmessagedelete;
        }
    if (d.group_pgmessagesend !== undefined && d.group_pgmessagesend !== null && d.group_pgmessagesend !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgmessagesend"] = d.group_pgmessagesend;
        }
    if (d.group_pgcontactadd !== undefined && d.group_pgcontactadd !== null && d.group_pgcontactadd !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgcontactadd"] = d.group_pgcontactadd;
        }
    if (d.group_pgcontactedit !== undefined && d.group_pgcontactedit !== null && d.group_pgcontactedit !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgcontactedit"] = d.group_pgcontactedit;
        }
    if (d.group_pgcontactdelete !== undefined && d.group_pgcontactdelete !== null && d.group_pgcontactdelete !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgcontactdelete"] = d.group_pgcontactdelete;
        }
    if (d.group_pgcontactmerge !== undefined && d.group_pgcontactmerge !== null && d.group_pgcontactmerge !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgcontactmerge"] = d.group_pgcontactmerge;
        }
    if (d.group_pgcontactimport !== undefined && d.group_pgcontactimport !== null && d.group_pgcontactimport !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgcontactimport"] = d.group_pgcontactimport;
        }
    if (d.group_pgcontactapprove !== undefined && d.group_pgcontactapprove !== null && d.group_pgcontactapprove !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgcontactapprove"] = d.group_pgcontactapprove;
        }
    if (d.group_pgcontactexport !== undefined && d.group_pgcontactexport !== null && d.group_pgcontactexport !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgcontactexport"] = d.group_pgcontactexport;
        }
    if (d.group_pgcontactsync !== undefined && d.group_pgcontactsync !== null && d.group_pgcontactsync !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgcontactsync"] = d.group_pgcontactsync;
        }
    if (d.group_pgcontactfilters !== undefined && d.group_pgcontactfilters !== null && d.group_pgcontactfilters !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgcontactfilters"] = d.group_pgcontactfilters;
        }
    if (d.group_pgcontactactions !== undefined && d.group_pgcontactactions !== null && d.group_pgcontactactions !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgcontactactions"] = d.group_pgcontactactions;
        }
    if (d.group_pgcontactfields !== undefined && d.group_pgcontactfields !== null && d.group_pgcontactfields !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgcontactfields"] = d.group_pgcontactfields;
        }
    if (d.group_pg_user_add !== undefined && d.group_pg_user_add !== null && d.group_pg_user_add !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pg_user_add"] = d.group_pg_user_add;
        }
    if (d.group_pg_user_edit !== undefined && d.group_pg_user_edit !== null && d.group_pg_user_edit !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pg_user_edit"] = d.group_pg_user_edit;
        }
    if (d.group_pg_user_delete !== undefined && d.group_pg_user_delete !== null && d.group_pg_user_delete !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pg_user_delete"] = d.group_pg_user_delete;
        }
    if (d.group_pggroupadd !== undefined && d.group_pggroupadd !== null && d.group_pggroupadd !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pggroupadd"] = d.group_pggroupadd;
        }
    if (d.group_pggroupedit !== undefined && d.group_pggroupedit !== null && d.group_pggroupedit !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pggroupedit"] = d.group_pggroupedit;
        }
    if (d.group_pggroupdelete !== undefined && d.group_pggroupdelete !== null && d.group_pggroupdelete !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pggroupdelete"] = d.group_pggroupdelete;
        }
    if (d.group_pgtemplateadd !== undefined && d.group_pgtemplateadd !== null && d.group_pgtemplateadd !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgtemplateadd"] = d.group_pgtemplateadd;
        }
    if (d.group_pgtemplateedit !== undefined && d.group_pgtemplateedit !== null && d.group_pgtemplateedit !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgtemplateedit"] = d.group_pgtemplateedit;
        }
    if (d.group_pgtemplatedelete !== undefined && d.group_pgtemplatedelete !== null && d.group_pgtemplatedelete !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgtemplatedelete"] = d.group_pgtemplatedelete;
        }
    if (d.group_pgpersonalizationadd !== undefined && d.group_pgpersonalizationadd !== null && d.group_pgpersonalizationadd !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgpersonalizationadd"] = d.group_pgpersonalizationadd;
        }
    if (d.group_pgpersonalizationedit !== undefined && d.group_pgpersonalizationedit !== null && d.group_pgpersonalizationedit !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgpersonalizationedit"] = d.group_pgpersonalizationedit;
        }
    if (d.group_pgpersonalizationdelete !== undefined && d.group_pgpersonalizationdelete !== null && d.group_pgpersonalizationdelete !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgpersonalizationdelete"] = d.group_pgpersonalizationdelete;
        }
    if (d.group_pgautomationmanage !== undefined && d.group_pgautomationmanage !== null && d.group_pgautomationmanage !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgautomationmanage"] = d.group_pgautomationmanage;
        }
    if (d.group_pgformedit !== undefined && d.group_pgformedit !== null && d.group_pgformedit !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgformedit"] = d.group_pgformedit;
        }
    if (d.group_pgreportscampaign !== undefined && d.group_pgreportscampaign !== null && d.group_pgreportscampaign !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgreportscampaign"] = d.group_pgreportscampaign;
        }
    if (d.group_pgreportslist !== undefined && d.group_pgreportslist !== null && d.group_pgreportslist !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgreportslist"] = d.group_pgreportslist;
        }
    if (d.group_pgreportsuser !== undefined && d.group_pgreportsuser !== null && d.group_pgreportsuser !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgreportsuser"] = d.group_pgreportsuser;
        }
    if (d.group_pgstartupreports !== undefined && d.group_pgstartupreports !== null && d.group_pgstartupreports !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgstartupreports"] = d.group_pgstartupreports;
        }
    if (d.group_pgreportstrend !== undefined && d.group_pgreportstrend !== null && d.group_pgreportstrend !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgreportstrend"] = d.group_pgreportstrend;
        }
    if (d.group_pgstartupgettingstarted !== undefined && d.group_pgstartupgettingstarted !== null && d.group_pgstartupgettingstarted !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgstartupgettingstarted"] = d.group_pgstartupgettingstarted;
        }
    if (d.group_pgdeal !== undefined && d.group_pgdeal !== null && d.group_pgdeal !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgdeal"] = d.group_pgdeal;
        }
    if (d.group_pgdealdelete !== undefined && d.group_pgdealdelete !== null && d.group_pgdealdelete !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgdealdelete"] = d.group_pgdealdelete;
        }
    if (d.group_pgdealreassign !== undefined && d.group_pgdealreassign !== null && d.group_pgdealreassign !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgdealreassign"] = d.group_pgdealreassign;
        }
    if (d.group_pgdealgroupadd !== undefined && d.group_pgdealgroupadd !== null && d.group_pgdealgroupadd !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgdealgroupadd"] = d.group_pgdealgroupadd;
        }
    if (d.group_pgdealgroupedit !== undefined && d.group_pgdealgroupedit !== null && d.group_pgdealgroupedit !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgdealgroupedit"] = d.group_pgdealgroupedit;
        }
    if (d.group_pgdealgroupdelete !== undefined && d.group_pgdealgroupdelete !== null && d.group_pgdealgroupdelete !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgdealgroupdelete"] = d.group_pgdealgroupdelete;
        }
    if (d.group_pgsavedresponsesmanage !== undefined && d.group_pgsavedresponsesmanage !== null && d.group_pgsavedresponsesmanage !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["pgsavedresponsesmanage"] = d.group_pgsavedresponsesmanage;
        }
    if (d.group_reqapproval !== undefined && d.group_reqapproval !== null && d.group_reqapproval !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["reqapproval"] = d.group_reqapproval;
        }
    if (d.group_reqapproval1st !== undefined && d.group_reqapproval1st !== null && d.group_reqapproval1st !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["reqapproval1st"] = d.group_reqapproval1st;
        }
    if (d.group_reqapprovalnotify !== undefined && d.group_reqapprovalnotify !== null && d.group_reqapprovalnotify !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["reqapprovalnotify"] = d.group_reqapprovalnotify;
        }
    if (d.group_socialdata !== undefined && d.group_socialdata !== null && d.group_socialdata !== "") {
          if (!body["group"] || typeof body["group"] !== 'object' || Array.isArray(body["group"])) body["group"] = {};
          body["group"]["socialdata"] = d.group_socialdata;
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
