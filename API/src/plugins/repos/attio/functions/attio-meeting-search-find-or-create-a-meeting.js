const { utils } = require('./utils');

module.exports = {
  async attio_meeting_search_find_or_create_a_meeting(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/meetings";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.title !== undefined && d.title !== null && d.title !== '') payload.title = d.title;
    if (d.description !== undefined && d.description !== null && d.description !== '') payload.description = d.description;
    if (d.start !== undefined && d.start !== null && d.start !== '') {
      try { payload.start = utils.parseJsonInput(d.start, 'start', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.end !== undefined && d.end !== null && d.end !== '') {
      try { payload.end = utils.parseJsonInput(d.end, 'end', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.is_all_day !== undefined && d.is_all_day !== null && d.is_all_day !== '') payload.is_all_day = Boolean(d.is_all_day);
    if (d.participants !== undefined && d.participants !== null && d.participants !== '') {
      try { payload.participants = utils.parseJsonInput(d.participants, 'participants', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.linked_records !== undefined && d.linked_records !== null && d.linked_records !== '') {
      try { payload.linked_records = utils.parseJsonInput(d.linked_records, 'linked_records', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.external_ref !== undefined && d.external_ref !== null && d.external_ref !== '') {
      try { payload.external_ref = utils.parseJsonInput(d.external_ref, 'external_ref', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (payload.title === undefined) return { ok: false, error: 'title requis.' };
    if (payload.description === undefined) return { ok: false, error: 'description requis.' };
    if (payload.start === undefined) return { ok: false, error: 'start requis.' };
    if (payload.end === undefined) return { ok: false, error: 'end requis.' };
    if (payload.is_all_day === undefined) return { ok: false, error: 'is_all_day requis.' };
    if (payload.participants === undefined) return { ok: false, error: 'participants requis.' };
    if (payload.external_ref === undefined) return { ok: false, error: 'external_ref requis.' };
    const body = { data: payload };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const responsePayload = res.data || {};
    const rawItems = Array.isArray(responsePayload.items) ? responsePayload.items : Array.isArray(responsePayload.results) ? responsePayload.results : Array.isArray(responsePayload) ? responsePayload : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && (r.name || r.title || ''),
      url: r && (r.url || r.html_url || ''),
      status: r && (r.status || r.state || ''),
      created_at: r && (r.created_at || r.createdAt || ''),
      updated_at: r && (r.updated_at || r.updatedAt || ''),
      raw: r
    }));

    return {
      ok: true,
      items,
      totalCount: Number(responsePayload.total || responsePayload.count || items.length),
      nextCursor: responsePayload.next_cursor || responsePayload.next || null
    };
  }
};
