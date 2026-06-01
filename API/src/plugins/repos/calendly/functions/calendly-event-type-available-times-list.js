const { utils } = require('./utils');

module.exports = {
  async calendly_event_type_available_times_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const eventType = String(d.eventTypeUri || '').trim();
    const startTime = String(d.startTime || '').trim();
    const endTime = String(d.endTime || '').trim();
    if (!eventType) return { ok: false, error: 'eventTypeUri requis.' };
    if (!startTime || !endTime) return { ok: false, error: 'startTime et endTime requis.' };

    const res = await utils.calendlyRequest(opts, '/event_type_available_times', {
      query: { event_type: eventType, start_time: startTime, end_time: endTime }
    });
    if (!res.ok) return res;

    const collection = Array.isArray(res.data?.collection) ? res.data.collection : [];
    const items = collection.map((x) => ({
      uri: x.scheduling_url || '',
      name: x.status || 'available',
      start_time: x.start_time || '',
      end_time: x.end_time || '',
      status: x.status || ''
    }));
    return { ok: true, events: items, totalCount: String(items.length) };
  }
};
