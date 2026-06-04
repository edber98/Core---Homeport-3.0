const { utils } = require('./utils');

module.exports = {
  async mailgun_message_send_post_v3_domain_name_messages(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/{domain_name}/messages";
    const domain_name = String(d.domain_name || '').trim();
    if (!domain_name) return { ok: false, error: 'domain_name requis.' };
    reqPath = reqPath.replace('{domain_name}', encodeURIComponent(domain_name));

    const query = {};

    const headers = {};

    const body = {};
    if (d.from !== undefined && d.from !== null && d.from !== '') {
      body["from"] = d.from;
    }
    if (d.to !== undefined && d.to !== null && d.to !== '') {
      body["to"] = d.to;
    }
    if (d.cc !== undefined && d.cc !== null && d.cc !== '') {
      body["cc"] = d.cc;
    }
    if (d.bcc !== undefined && d.bcc !== null && d.bcc !== '') {
      body["bcc"] = d.bcc;
    }
    if (d.subject !== undefined && d.subject !== null && d.subject !== '') {
      body["subject"] = d.subject;
    }
    if (d.text !== undefined && d.text !== null && d.text !== '') {
      body["text"] = d.text;
    }
    if (d.html !== undefined && d.html !== null && d.html !== '') {
      body["html"] = d.html;
    }
    if (d.amp_html !== undefined && d.amp_html !== null && d.amp_html !== '') {
      body["amp_html"] = d.amp_html;
    }
    if (d.attachment !== undefined && d.attachment !== null && d.attachment !== '') {
      body["attachment"] = d.attachment;
    }
    if (d.inline !== undefined && d.inline !== null && d.inline !== '') {
      body["inline"] = d.inline;
    }
    if (d.template !== undefined && d.template !== null && d.template !== '') {
      body["template"] = d.template;
    }
    if (d.t_version !== undefined && d.t_version !== null && d.t_version !== '') {
      body["t_version"] = d.t_version;
    }
    if (d.t_text !== undefined && d.t_text !== null && d.t_text !== '') {
      body["t_text"] = d.t_text;
    }
    if (d.t_variables !== undefined && d.t_variables !== null && d.t_variables !== '') {
      body["t_variables"] = d.t_variables;
    }
    if (d.o_tag !== undefined && d.o_tag !== null && d.o_tag !== '') {
      body["o_tag"] = d.o_tag;
    }
    if (d.o_dkim !== undefined && d.o_dkim !== null && d.o_dkim !== '') {
      body["o_dkim"] = d.o_dkim;
    }
    if (d.o_secondary_dkim !== undefined && d.o_secondary_dkim !== null && d.o_secondary_dkim !== '') {
      body["o_secondary_dkim"] = d.o_secondary_dkim;
    }
    if (d.o_secondary_dkim_public !== undefined && d.o_secondary_dkim_public !== null && d.o_secondary_dkim_public !== '') {
      body["o_secondary_dkim_public"] = d.o_secondary_dkim_public;
    }
    if (d.o_deliverytime !== undefined && d.o_deliverytime !== null && d.o_deliverytime !== '') {
      body["o_deliverytime"] = d.o_deliverytime;
    }
    if (d.o_deliver_within !== undefined && d.o_deliver_within !== null && d.o_deliver_within !== '') {
      body["o_deliver_within"] = d.o_deliver_within;
    }
    if (d.o_deliverytime_optimize_period !== undefined && d.o_deliverytime_optimize_period !== null && d.o_deliverytime_optimize_period !== '') {
      body["o_deliverytime_optimize_period"] = d.o_deliverytime_optimize_period;
    }
    if (d.o_time_zone_localize !== undefined && d.o_time_zone_localize !== null && d.o_time_zone_localize !== '') {
      body["o_time_zone_localize"] = d.o_time_zone_localize;
    }
    if (d.o_testmode !== undefined && d.o_testmode !== null && d.o_testmode !== '') {
      body["o_testmode"] = d.o_testmode;
    }
    if (d.o_tracking !== undefined && d.o_tracking !== null && d.o_tracking !== '') {
      body["o_tracking"] = d.o_tracking;
    }
    if (d.o_tracking_clicks !== undefined && d.o_tracking_clicks !== null && d.o_tracking_clicks !== '') {
      body["o_tracking_clicks"] = d.o_tracking_clicks;
    }
    if (d.o_tracking_opens !== undefined && d.o_tracking_opens !== null && d.o_tracking_opens !== '') {
      body["o_tracking_opens"] = d.o_tracking_opens;
    }
    if (d.o_require_tls !== undefined && d.o_require_tls !== null && d.o_require_tls !== '') {
      body["o_require_tls"] = d.o_require_tls;
    }
    if (d.o_skip_verification !== undefined && d.o_skip_verification !== null && d.o_skip_verification !== '') {
      body["o_skip_verification"] = d.o_skip_verification;
    }
    if (d.o_sending_ip !== undefined && d.o_sending_ip !== null && d.o_sending_ip !== '') {
      body["o_sending_ip"] = d.o_sending_ip;
    }
    if (d.o_sending_ip_pool !== undefined && d.o_sending_ip_pool !== null && d.o_sending_ip_pool !== '') {
      body["o_sending_ip_pool"] = d.o_sending_ip_pool;
    }
    if (d.o_tracking_pixel_location_top !== undefined && d.o_tracking_pixel_location_top !== null && d.o_tracking_pixel_location_top !== '') {
      body["o_tracking_pixel_location_top"] = d.o_tracking_pixel_location_top;
    }
    if (d.o_archive_to !== undefined && d.o_archive_to !== null && d.o_archive_to !== '') {
      body["o_archive_to"] = d.o_archive_to;
    }
    if (d.o_suppress_headers !== undefined && d.o_suppress_headers !== null && d.o_suppress_headers !== '') {
      body["o_suppress_headers"] = d.o_suppress_headers;
    }
    if (d.h_x_my_header !== undefined && d.h_x_my_header !== null && d.h_x_my_header !== '') {
      body["h_x_my_header"] = d.h_x_my_header;
    }
    if (d.v_my_var !== undefined && d.v_my_var !== null && d.v_my_var !== '') {
      body["v_my_var"] = d.v_my_var;
    }
    if (d.recipient_variables !== undefined && d.recipient_variables !== null && d.recipient_variables !== '') {
      body["recipient_variables"] = d.recipient_variables;
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

