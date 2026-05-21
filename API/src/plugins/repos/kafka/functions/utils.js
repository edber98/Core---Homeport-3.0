function str(v) {
  return String(v === undefined || v === null ? '' : v).trim();
}

function toNum(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function parseJson(v, label, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(String(v));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function itemFromRaw(raw, fallbackName) {
  const r = raw || {};
  return {
    id: str(r.id || r.messageId || r.offset || r.topicName || ''),
    name: str(r.name || r.topic || fallbackName || ''),
    url: '',
    status: str(r.status || ''),
    created_at: '',
    updated_at: '',
    raw: r
  };
}

function listResult(items, raw) {
  return { ok: true, items, totalCount: items.length, nextCursor: null, raw: raw || items };
}

function itemResult(raw, fallbackName) {
  const item = itemFromRaw(raw, fallbackName);
  return { ok: true, ...item };
}

function actionResult(message, raw) {
  return { ok: true, status: 200, message, raw: raw || null };
}

function getKafkaCreds(opts) {
  const c = (opts && opts.credentials) || {};
  const brokersInput = str(c.brokers || c.bootstrapServers || c.baseUrl || '');
  const brokers = brokersInput.split(',').map((x) => x.trim()).filter(Boolean);
  if (!brokers.length) throw new Error('Identifiant Kafka requis: brokers (ex: localhost:9092).');

  const clientId = str(c.clientId || 'kinn-homeport');
  const ssl = c.ssl === true;
  const mechanism = str(c.saslMechanism || '');
  const username = str(c.username || '');
  const password = str(c.password || '');

  let sasl;
  if (mechanism && username) {
    sasl = { mechanism, username, password };
  }

  return { brokers, clientId, ssl, sasl };
}

async function withAdmin(opts, fn) {
  let Kafka;
  try {
    ({ Kafka } = require('kafkajs'));
  } catch {
    return { ok: false, error: "Le package 'kafkajs' n'est pas installé. Exécuter: npm i kafkajs (dans API/)." };
  }

  const cfg = getKafkaCreds(opts);
  const kafka = new Kafka(cfg);
  const admin = kafka.admin();
  try {
    await admin.connect();
    return await fn(admin);
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { await admin.disconnect(); } catch {}
  }
}

async function withProducer(opts, fn) {
  let Kafka;
  try {
    ({ Kafka } = require('kafkajs'));
  } catch {
    return { ok: false, error: "Le package 'kafkajs' n'est pas installé. Exécuter: npm i kafkajs (dans API/)." };
  }

  const cfg = getKafkaCreds(opts);
  const kafka = new Kafka(cfg);
  const producer = kafka.producer();
  try {
    await producer.connect();
    return await fn(producer);
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { await producer.disconnect(); } catch {}
  }
}

async function withConsumer(opts, groupId, fn) {
  let Kafka;
  try {
    ({ Kafka } = require('kafkajs'));
  } catch {
    return { ok: false, error: "Le package 'kafkajs' n'est pas installé. Exécuter: npm i kafkajs (dans API/)." };
  }

  const cfg = getKafkaCreds(opts);
  const kafka = new Kafka(cfg);
  const consumer = kafka.consumer({ groupId });
  try {
    await consumer.connect();
    return await fn(consumer);
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { await consumer.disconnect(); } catch {}
  }
}

async function run(key, inputs, opts) {
  const d = inputs || {};

  try {
    if (key === 'kafka_topic_list_topics') {
      return withAdmin(opts, async (admin) => {
        const topics = await admin.listTopics();
        return listResult(topics.map((t) => itemFromRaw({ id: t, name: t, status: 'ok' }, t)), topics);
      });
    }

    if (key === 'kafka_topic_describe_topic') {
      const topic = str(d.topic);
      if (!topic) return { ok: false, error: 'topic requis.' };
      return withAdmin(opts, async (admin) => {
        const data = await admin.fetchTopicMetadata({ topics: [topic] });
        const meta = (data && data.topics && data.topics[0]) || { name: topic };
        return itemResult({ id: meta.name || topic, name: meta.name || topic, status: 'ok', partitions: meta.partitions || [], raw: meta }, topic);
      });
    }

    if (key === 'kafka_message_publish_message') {
      const topic = str(d.topic);
      const value = d.value === undefined || d.value === null ? '' : String(d.value);
      if (!topic) return { ok: false, error: 'topic requis.' };
      if (!value) return { ok: false, error: 'value requis.' };

      const headersRaw = parseJson(d.headers, 'headers', {});
      const headers = {};
      Object.entries(headersRaw || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null) headers[String(k)] = String(v);
      });

      const message = {
        key: d.key !== undefined && d.key !== null && d.key !== '' ? String(d.key) : undefined,
        value,
        headers
      };
      if (d.partition !== undefined && d.partition !== null && d.partition !== '') message.partition = Number(d.partition);

      return withProducer(opts, async (producer) => {
        const out = await producer.send({ topic, messages: [message] });
        return actionResult('Message publié.', out);
      });
    }

    if (key === 'kafka_message_publish_batch') {
      const topic = str(d.topic);
      if (!topic) return { ok: false, error: 'topic requis.' };
      const messagesIn = parseJson(d.messages, 'messages', []);
      if (!Array.isArray(messagesIn) || !messagesIn.length) return { ok: false, error: 'messages doit être un tableau non vide.' };

      const messages = messagesIn.map((m) => {
        const mm = m || {};
        const msg = {
          key: mm.key !== undefined && mm.key !== null && mm.key !== '' ? String(mm.key) : undefined,
          value: String(mm.value === undefined || mm.value === null ? '' : mm.value)
        };
        if (mm.headers && typeof mm.headers === 'object') {
          const h = {};
          Object.entries(mm.headers).forEach(([k, v]) => {
            if (v !== undefined && v !== null) h[String(k)] = String(v);
          });
          msg.headers = h;
        }
        if (mm.partition !== undefined && mm.partition !== null && mm.partition !== '') msg.partition = Number(mm.partition);
        return msg;
      });

      return withProducer(opts, async (producer) => {
        const out = await producer.send({ topic, messages });
        return actionResult(`Lot publié (${messages.length} messages).`, out);
      });
    }

    if (key === 'kafka_message_consume_batch') {
      const topic = str(d.topic);
      const groupId = str(d.group_id || d.groupId);
      if (!topic) return { ok: false, error: 'topic requis.' };
      if (!groupId) return { ok: false, error: 'group_id requis.' };

      const maxMessages = Math.max(1, Math.min(1000, toNum(d.max_messages, 10)));
      const timeoutMs = Math.max(100, Math.min(120000, toNum(d.timeout_ms, 5000)));
      const fromBeginning = d.from_beginning === true;

      return withConsumer(opts, groupId, async (consumer) => {
        await consumer.subscribe({ topic, fromBeginning });

        const items = [];
        let resolveDone;
        const done = new Promise((r) => { resolveDone = r; });
        const timer = setTimeout(() => resolveDone('timeout'), timeoutMs);

        await consumer.run({
          eachMessage: async ({ topic: t, partition, message }) => {
            const value = message.value ? message.value.toString('utf8') : '';
            const headers = {};
            if (message.headers) {
              Object.entries(message.headers).forEach(([k, v]) => {
                headers[k] = v ? v.toString('utf8') : '';
              });
            }

            items.push(itemFromRaw({
              id: `${t}:${partition}:${message.offset}`,
              name: t,
              status: 'consumed',
              topic: t,
              partition,
              offset: message.offset,
              timestamp: message.timestamp,
              key: message.key ? message.key.toString('utf8') : null,
              value,
              headers
            }, t));

            if (items.length >= maxMessages) resolveDone('max');
          }
        });

        await done;
        clearTimeout(timer);
        try { await consumer.stop(); } catch {}

        return listResult(items, { topic, groupId, consumed: items.length, timeoutMs });
      });
    }

    if (key === 'kafka_offset_fetch_topic_offsets') {
      const topic = str(d.topic);
      if (!topic) return { ok: false, error: 'topic requis.' };
      return withAdmin(opts, async (admin) => {
        const offsets = await admin.fetchTopicOffsets(topic);
        return itemResult({ id: topic, name: topic, status: 'ok', offsets }, topic);
      });
    }

    if (key === 'kafka_offset_fetch_group_offsets') {
      const groupId = str(d.group_id || d.groupId);
      const topic = str(d.topic);
      if (!groupId || !topic) return { ok: false, error: 'group_id et topic requis.' };

      return withAdmin(opts, async (admin) => {
        const offsets = await admin.fetchOffsets({ groupId, topic });
        return itemResult({ id: `${groupId}:${topic}`, name: groupId, status: 'ok', topic, offsets }, groupId);
      });
    }

    if (key === 'kafka_offset_commit_group_offsets') {
      const groupId = str(d.group_id || d.groupId);
      const topic = str(d.topic);
      const partitions = parseJson(d.partitions, 'partitions', []);
      if (!groupId || !topic) return { ok: false, error: 'group_id et topic requis.' };
      if (!Array.isArray(partitions) || !partitions.length) return { ok: false, error: 'partitions doit être un tableau non vide.' };

      return withConsumer(opts, groupId, async (consumer) => {
        const offsets = partitions.map((p) => ({
          topic,
          partition: Number(p.partition),
          offset: String(p.offset)
        }));
        await consumer.commitOffsets(offsets);
        return actionResult('Offsets commités.', { groupId, topic, offsets });
      });
    }

    return { ok: false, error: `Action inconnue: ${key}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run, parseJson } };
