module.exports = {
  async asana_webhook_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const body = (msg && msg.body) || {};
    const events = body.events || [body];
    const ev = events[0] || {};
    return {
      ok: true,
      action: ev.action || ev.type || "",
      resourceType: ev.resource ? ev.resource.resource_type || "" : "",
      resourceGid: ev.resource ? ev.resource.gid || "" : "",
      timestamp: body.created_at || new Date().toISOString(),
      payload: JSON.stringify(body)
    };
  }
};
