const { utils } = require('./utils');

module.exports = {
  async front_shift_update_update_shift(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/shifts/{shift_id}";
    const shift_id = String(d.shift_id || '').trim();
    if (!shift_id) return { ok: false, error: 'shift_id requis.' };
    reqPath = reqPath.replace('{shift_id}', encodeURIComponent(shift_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.color !== undefined && d.color !== null && d.color !== '') {
      body["color"] = d.color;
    }
    if (d.timezone !== undefined && d.timezone !== null && d.timezone !== '') {
      body["timezone"] = d.timezone;
    }
    if (d.times !== undefined && d.times !== null && d.times !== '') {
      body["times"] = d.times;
    }
    if (d.times_mon !== undefined && d.times_mon !== null && d.times_mon !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      body["times"]["mon"] = d.times_mon;
    }
    if (d.times_mon_start !== undefined && d.times_mon_start !== null && d.times_mon_start !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["mon"] || typeof body["times"]["mon"] !== 'object' || Array.isArray(body["times"]["mon"])) body["times"]["mon"] = {};
      body["times"]["mon"]["start"] = d.times_mon_start;
    }
    if (d.times_mon_end !== undefined && d.times_mon_end !== null && d.times_mon_end !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["mon"] || typeof body["times"]["mon"] !== 'object' || Array.isArray(body["times"]["mon"])) body["times"]["mon"] = {};
      body["times"]["mon"]["end"] = d.times_mon_end;
    }
    if (d.times_tue !== undefined && d.times_tue !== null && d.times_tue !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      body["times"]["tue"] = d.times_tue;
    }
    if (d.times_tue_start !== undefined && d.times_tue_start !== null && d.times_tue_start !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["tue"] || typeof body["times"]["tue"] !== 'object' || Array.isArray(body["times"]["tue"])) body["times"]["tue"] = {};
      body["times"]["tue"]["start"] = d.times_tue_start;
    }
    if (d.times_tue_end !== undefined && d.times_tue_end !== null && d.times_tue_end !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["tue"] || typeof body["times"]["tue"] !== 'object' || Array.isArray(body["times"]["tue"])) body["times"]["tue"] = {};
      body["times"]["tue"]["end"] = d.times_tue_end;
    }
    if (d.times_wed !== undefined && d.times_wed !== null && d.times_wed !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      body["times"]["wed"] = d.times_wed;
    }
    if (d.times_wed_start !== undefined && d.times_wed_start !== null && d.times_wed_start !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["wed"] || typeof body["times"]["wed"] !== 'object' || Array.isArray(body["times"]["wed"])) body["times"]["wed"] = {};
      body["times"]["wed"]["start"] = d.times_wed_start;
    }
    if (d.times_wed_end !== undefined && d.times_wed_end !== null && d.times_wed_end !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["wed"] || typeof body["times"]["wed"] !== 'object' || Array.isArray(body["times"]["wed"])) body["times"]["wed"] = {};
      body["times"]["wed"]["end"] = d.times_wed_end;
    }
    if (d.times_thu !== undefined && d.times_thu !== null && d.times_thu !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      body["times"]["thu"] = d.times_thu;
    }
    if (d.times_thu_start !== undefined && d.times_thu_start !== null && d.times_thu_start !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["thu"] || typeof body["times"]["thu"] !== 'object' || Array.isArray(body["times"]["thu"])) body["times"]["thu"] = {};
      body["times"]["thu"]["start"] = d.times_thu_start;
    }
    if (d.times_thu_end !== undefined && d.times_thu_end !== null && d.times_thu_end !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["thu"] || typeof body["times"]["thu"] !== 'object' || Array.isArray(body["times"]["thu"])) body["times"]["thu"] = {};
      body["times"]["thu"]["end"] = d.times_thu_end;
    }
    if (d.times_fri !== undefined && d.times_fri !== null && d.times_fri !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      body["times"]["fri"] = d.times_fri;
    }
    if (d.times_fri_start !== undefined && d.times_fri_start !== null && d.times_fri_start !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["fri"] || typeof body["times"]["fri"] !== 'object' || Array.isArray(body["times"]["fri"])) body["times"]["fri"] = {};
      body["times"]["fri"]["start"] = d.times_fri_start;
    }
    if (d.times_fri_end !== undefined && d.times_fri_end !== null && d.times_fri_end !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["fri"] || typeof body["times"]["fri"] !== 'object' || Array.isArray(body["times"]["fri"])) body["times"]["fri"] = {};
      body["times"]["fri"]["end"] = d.times_fri_end;
    }
    if (d.times_sat !== undefined && d.times_sat !== null && d.times_sat !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      body["times"]["sat"] = d.times_sat;
    }
    if (d.times_sat_start !== undefined && d.times_sat_start !== null && d.times_sat_start !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["sat"] || typeof body["times"]["sat"] !== 'object' || Array.isArray(body["times"]["sat"])) body["times"]["sat"] = {};
      body["times"]["sat"]["start"] = d.times_sat_start;
    }
    if (d.times_sat_end !== undefined && d.times_sat_end !== null && d.times_sat_end !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["sat"] || typeof body["times"]["sat"] !== 'object' || Array.isArray(body["times"]["sat"])) body["times"]["sat"] = {};
      body["times"]["sat"]["end"] = d.times_sat_end;
    }
    if (d.times_sun !== undefined && d.times_sun !== null && d.times_sun !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      body["times"]["sun"] = d.times_sun;
    }
    if (d.times_sun_start !== undefined && d.times_sun_start !== null && d.times_sun_start !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["sun"] || typeof body["times"]["sun"] !== 'object' || Array.isArray(body["times"]["sun"])) body["times"]["sun"] = {};
      body["times"]["sun"]["start"] = d.times_sun_start;
    }
    if (d.times_sun_end !== undefined && d.times_sun_end !== null && d.times_sun_end !== '') {
      if (!body["times"] || typeof body["times"] !== 'object' || Array.isArray(body["times"])) body["times"] = {};
      if (!body["times"]["sun"] || typeof body["times"]["sun"] !== 'object' || Array.isArray(body["times"]["sun"])) body["times"]["sun"] = {};
      body["times"]["sun"]["end"] = d.times_sun_end;
    }
    if (d.teammate_ids !== undefined && d.teammate_ids !== null && d.teammate_ids !== '') {
      body["teammate_ids"] = d.teammate_ids;
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

