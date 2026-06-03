module.exports = {
  async box_webhook_event(node, msg, inputs, opts) {
    const payload = inputs || msg || {};
    return {
      ok: true,
      eventType: payload.event_type || payload.trigger || "",
      itemId: payload.source?.id || payload.item_id || "",
      itemType: payload.source?.type || payload.item_type || "",
      payload: JSON.stringify(payload)
    };
  }
};
