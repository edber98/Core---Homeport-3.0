module.exports = {
  async activecampaign_event_create_event_trackevent(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};

    const key = String(d.key || '').trim();
    const event = String(d.event || '').trim();
    const actid = String(d.actid || '').trim();
    const visit = String(d.visit || '').trim();
    if (!key) return { ok: false, error: 'key requis.' };
    if (!event) return { ok: false, error: 'event requis.' };
    if (!actid) return { ok: false, error: 'actid requis.' };
    if (!visit) return { ok: false, error: 'visit requis.' };

    const params = new URLSearchParams();
    params.set('key', key);
    params.set('event', event);
    params.set('actid', actid);
    params.set('visit', visit);
    if (d.eventdata !== undefined && d.eventdata !== null && d.eventdata !== '') params.set('eventdata', String(d.eventdata));

    log('Requête en cours...');
    let res;
    try {
      res = await fetch('https://trackcmp.net/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }

    if (!res.ok) {
      return {
        ok: false,
        error: data && (data.message || data.error) ? (data.message || data.error) : 'HTTP ' + res.status,
        status: res.status,
        details: data
      };
    }

    return {
      ok: true,
      status: res.status,
      message: data && data.message ? data.message : '',
      raw: data
    };
  }
};
