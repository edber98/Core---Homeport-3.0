function parseJson(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function cleanString(value) {
  return String(value || "").trim();
}

function actionResult(message, raw, status = 200) {
  return { ok: true, status, message, raw };
}

function listResult(items, raw) {
  return { ok: true, totalCount: items.length, items, raw: raw || items };
}

function decodeMessage(msg) {
  if (!msg) return null;
  const content = msg.content ? msg.content.toString("utf8") : "";
  let parsed = null;
  try { parsed = JSON.parse(content); } catch { parsed = null; }
  const props = msg.properties || {};
  return {
    id: props.messageId || msg.fields.deliveryTag || "",
    name: msg.fields.routingKey || "message",
    status: msg.fields.redelivered ? "redelivered" : "ready",
    properties: {
      exchange: msg.fields.exchange,
      routingKey: msg.fields.routingKey,
      redelivered: !!msg.fields.redelivered,
      contentType: props.contentType || "",
      timestamp: props.timestamp || null,
      headers: props.headers || {},
      payload: parsed !== null ? parsed : content
    },
    raw: {
      fields: msg.fields,
      properties: props,
      content
    }
  };
}

async function withChannel(opts, worker) {
  const credentials = (opts && opts.credentials) || {};
  if (credentials.url === "test") {
    return worker({
      defaultQueue: cleanString(credentials.defaultQueue || ""),
      defaultExchange: cleanString(credentials.defaultExchange || ""),
      channel: {
        sendToQueue: () => true,
        publish: () => true,
        get: async () => null,
        ack: () => {},
        nack: () => {},
        checkQueue: async () => ({ messageCount: 0, consumerCount: 0 }),
        purgeQueue: async () => ({ messageCount: 0 })
      },
      close: async () => {}
    });
  }

  const url = cleanString(credentials.url);
  if (!url) return { ok: false, error: "Identifiant RabbitMQ requis: url." };

  let amqp;
  try {
    amqp = require("amqplib");
  } catch {
    return { ok: false, error: "Le package 'amqplib' n'est pas installé. Exécuter: npm install amqplib dans API/." };
  }

  let conn;
  let channel;
  try {
    conn = await amqp.connect(url);
    channel = await conn.createChannel();
    const close = async () => {
      try { await channel.close(); } catch {}
      try { await conn.close(); } catch {}
    };
    const result = await worker({
      channel,
      defaultQueue: cleanString(credentials.defaultQueue || ""),
      defaultExchange: cleanString(credentials.defaultExchange || ""),
      close
    });
    await close();
    return result;
  } catch (e) {
    try { if (channel) await channel.close(); } catch {}
    try { if (conn) await conn.close(); } catch {}
    return { ok: false, error: e.message };
  }
}

async function run(key, inputs, opts) {
  const d = inputs || {};

  try {
    if (key === "rabbitmq_publish_queue") {
      const payload = String(d.payload || "");
      const queue = cleanString(d.queue);
      if (!payload) return { ok: false, error: "payload requis." };
      return withChannel(opts, async ({ channel, defaultQueue }) => {
        const q = queue || defaultQueue;
        if (!q) return { ok: false, error: "queue requise (input ou credentials.defaultQueue)." };
        const ok = channel.sendToQueue(q, Buffer.from(payload, "utf8"), {
          persistent: d.persistent === false ? false : true,
          contentType: cleanString(d.contentType || "text/plain")
        });
        return actionResult(ok ? "Message publié dans la queue." : "Message publié (buffer saturé).", { queue: q, size: payload.length });
      });
    }

    if (key === "rabbitmq_publish_exchange") {
      const payload = String(d.payload || "");
      const routingKey = cleanString(d.routingKey);
      const exchange = cleanString(d.exchange);
      if (!payload || !routingKey) return { ok: false, error: "payload et routingKey requis." };
      return withChannel(opts, async ({ channel, defaultExchange }) => {
        const ex = exchange || defaultExchange;
        if (ex === undefined || ex === null) return { ok: false, error: "exchange requis (input ou credentials.defaultExchange)." };
        const ok = channel.publish(ex, routingKey, Buffer.from(payload, "utf8"), {
          persistent: d.persistent === false ? false : true,
          contentType: cleanString(d.contentType || "text/plain")
        });
        return actionResult(ok ? "Message publié dans l'exchange." : "Message publié (buffer saturé).", { exchange: ex, routingKey, size: payload.length });
      });
    }

    if (key === "rabbitmq_publish_json") {
      const payload = parseJson(d.payload, "payload", null);
      if (!payload || typeof payload !== "object") return { ok: false, error: "payload JSON objet requis." };
      const queue = cleanString(d.queue);
      const exchange = cleanString(d.exchange);
      const routingKey = cleanString(d.routingKey);
      return withChannel(opts, async ({ channel, defaultQueue, defaultExchange }) => {
        const data = JSON.stringify(payload);
        const options = { persistent: d.persistent === false ? false : true, contentType: "application/json" };

        if (exchange || defaultExchange) {
          const ex = exchange || defaultExchange;
          const rk = routingKey || queue || defaultQueue;
          if (!rk) return { ok: false, error: "routingKey ou queue requis pour publication exchange." };
          const ok = channel.publish(ex, rk, Buffer.from(data, "utf8"), options);
          return actionResult(ok ? "Message JSON publié dans l'exchange." : "Message JSON publié (buffer saturé).", { exchange: ex, routingKey: rk });
        }

        const q = queue || defaultQueue;
        if (!q) return { ok: false, error: "queue requise (input ou credentials.defaultQueue)." };
        const ok = channel.sendToQueue(q, Buffer.from(data, "utf8"), options);
        return actionResult(ok ? "Message JSON publié dans la queue." : "Message JSON publié (buffer saturé).", { queue: q });
      });
    }

    if (key === "rabbitmq_message_get") {
      const noAck = d.noAck === true;
      const requeueOnNack = d.requeueOnNack === false ? false : true;
      const queue = cleanString(d.queue);
      return withChannel(opts, async ({ channel, defaultQueue }) => {
        const q = queue || defaultQueue;
        if (!q) return { ok: false, error: "queue requise (input ou credentials.defaultQueue)." };
        const msg = await channel.get(q, { noAck });
        if (!msg) return { ok: true, id: "", name: q, status: "empty", properties: { queue: q }, raw: null };
        const decoded = decodeMessage(msg);
        if (!noAck) {
          if (requeueOnNack) channel.nack(msg, false, true);
          else channel.ack(msg);
        }
        return decoded;
      });
    }

    if (key === "rabbitmq_messages_get_batch") {
      const noAck = d.noAck === true;
      const requeueOnNack = d.requeueOnNack === false ? false : true;
      const limit = Math.max(1, Math.min(Number(d.limit || 10), 1000));
      const queue = cleanString(d.queue);
      return withChannel(opts, async ({ channel, defaultQueue }) => {
        const q = queue || defaultQueue;
        if (!q) return { ok: false, error: "queue requise (input ou credentials.defaultQueue)." };
        const items = [];
        for (let i = 0; i < limit; i += 1) {
          const msg = await channel.get(q, { noAck });
          if (!msg) break;
          const decoded = decodeMessage(msg);
          items.push(decoded);
          if (!noAck) {
            if (requeueOnNack) channel.nack(msg, false, true);
            else channel.ack(msg);
          }
        }
        return listResult(items, { queue: q, limit, returned: items.length });
      });
    }

    if (key === "rabbitmq_queue_check") {
      const queue = cleanString(d.queue);
      return withChannel(opts, async ({ channel, defaultQueue }) => {
        const q = queue || defaultQueue;
        if (!q) return { ok: false, error: "queue requise (input ou credentials.defaultQueue)." };
        const info = await channel.checkQueue(q);
        return {
          ok: true,
          id: q,
          name: q,
          status: "ok",
          properties: {
            messageCount: Number(info.messageCount || 0),
            consumerCount: Number(info.consumerCount || 0)
          },
          raw: info
        };
      });
    }

    if (key === "rabbitmq_queue_purge") {
      const queue = cleanString(d.queue);
      return withChannel(opts, async ({ channel, defaultQueue }) => {
        const q = queue || defaultQueue;
        if (!q) return { ok: false, error: "queue requise (input ou credentials.defaultQueue)." };
        const info = await channel.purgeQueue(q);
        return actionResult("Queue purgée.", { queue: q, purged: Number(info.messageCount || 0) });
      });
    }

    return { ok: false, error: "Action inconnue." };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run, parseJson } };
