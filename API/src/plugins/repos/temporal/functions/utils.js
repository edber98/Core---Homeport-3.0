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
  try { return JSON.parse(String(v)); } catch { throw new Error(`JSON invalide dans ${label}.`); }
}

function listResult(items, raw) {
  return { ok: true, items, totalCount: items.length, nextCursor: null, raw: raw || items };
}

function itemResult(raw, name) {
  const r = raw || {};
  return {
    ok: true,
    id: str(r.id || r.workflowId || r.scheduleId || ''),
    name: str(r.name || name || r.workflowType || ''),
    url: '',
    status: str(r.status || ''),
    created_at: str(r.created_at || r.startTime || ''),
    updated_at: str(r.updated_at || r.closeTime || ''),
    raw: r
  };
}

function actionResult(message, raw) {
  return { ok: true, status: 200, message, raw: raw || null };
}

async function withTemporal(opts, fn) {
  let Client;
  let Connection;
  try {
    ({ Client, Connection } = require('@temporalio/client'));
  } catch {
    return { ok: false, error: "Le package '@temporalio/client' n'est pas installé. Exécuter: npm i @temporalio/client (dans API/)." };
  }

  const c = (opts && opts.credentials) || {};
  const address = str(c.address || c.host || c.baseUrl || '');
  const namespace = str(c.namespace || 'default');
  if (!address) return { ok: false, error: 'Identifiant Temporal requis: address (ex: localhost:7233).' };

  const connOpts = { address };
  const apiKey = str(c.apiKey || '');
  if (apiKey) connOpts.apiKey = apiKey;

  if (c.tls === true || c.tls === 'true') {
    connOpts.tls = {};
    const serverName = str(c.serverName || '');
    if (serverName) connOpts.tls.serverName = serverName;
    const clientCert = str(c.clientCertPem || '');
    const clientKey = str(c.clientKeyPem || '');
    if (clientCert && clientKey) {
      connOpts.tls.clientCertPair = {
        crt: Buffer.from(clientCert),
        key: Buffer.from(clientKey)
      };
    }
  }

  let connection;
  try {
    connection = await Connection.connect(connOpts);
    const client = new Client({ connection, namespace });
    return await fn(client);
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { if (connection && connection.close) await connection.close(); } catch {}
  }
}

function getHandle(client, workflowId, runId) {
  return runId ? client.workflow.getHandle(workflowId, runId) : client.workflow.getHandle(workflowId);
}

async function run(key, inputs, opts) {
  const d = inputs || {};

  try {
    if (key === 'temporal_workflow_start') {
      const workflowId = str(d.workflow_id);
      const workflowType = str(d.workflow_type);
      const taskQueue = str(d.task_queue);
      const args = parseJson(d.args, 'args', []);
      if (!workflowId || !workflowType || !taskQueue) {
        return { ok: false, error: 'workflow_id, workflow_type et task_queue requis.' };
      }
      if (!Array.isArray(args)) return { ok: false, error: 'args doit être un tableau JSON.' };

      return withTemporal(opts, async (client) => {
        const handle = await client.workflow.start(workflowType, {
          workflowId,
          taskQueue,
          args
        });
        return itemResult({
          id: handle.workflowId,
          workflowId: handle.workflowId,
          runId: handle.firstExecutionRunId || handle.runId || '',
          status: 'started',
          workflowType,
          taskQueue
        }, workflowId);
      });
    }

    if (key === 'temporal_workflow_list') {
      const query = str(d.query || '');
      const pageSize = Math.max(1, Math.min(1000, toNum(d.page_size, 50)));

      return withTemporal(opts, async (client) => {
        const iter = client.workflow.list(query ? { query, pageSize } : { pageSize });
        const items = [];
        for await (const wf of iter) {
          items.push({
            id: str(wf.workflowId || ''),
            name: str((wf.type && wf.type.name) || wf.workflowType || wf.workflowId || ''),
            url: '',
            status: str(wf.status || ''),
            created_at: str(wf.startTime || ''),
            updated_at: str(wf.closeTime || ''),
            raw: wf
          });
          if (items.length >= pageSize) break;
        }
        return listResult(items);
      });
    }

    if (key === 'temporal_workflow_describe') {
      const workflowId = str(d.workflow_id);
      const runId = str(d.run_id || '');
      if (!workflowId) return { ok: false, error: 'workflow_id requis.' };

      return withTemporal(opts, async (client) => {
        const desc = await getHandle(client, workflowId, runId).describe();
        return itemResult({
          id: workflowId,
          workflowId,
          runId: runId || (desc && desc.runId) || '',
          status: str(desc && desc.status),
          name: str((desc && desc.type) || ''),
          startTime: desc && desc.startTime,
          closeTime: desc && desc.closeTime,
          raw: desc
        }, workflowId);
      });
    }

    if (key === 'temporal_workflow_signal') {
      const workflowId = str(d.workflow_id);
      const runId = str(d.run_id || '');
      const signal = str(d.signal);
      const args = parseJson(d.args, 'args', []);
      if (!workflowId || !signal) return { ok: false, error: 'workflow_id et signal requis.' };
      if (!Array.isArray(args)) return { ok: false, error: 'args doit être un tableau JSON.' };

      return withTemporal(opts, async (client) => {
        await getHandle(client, workflowId, runId).signal(signal, ...args);
        return actionResult('Signal envoyé.', { workflowId, runId, signal });
      });
    }

    if (key === 'temporal_workflow_query') {
      const workflowId = str(d.workflow_id);
      const runId = str(d.run_id || '');
      const queryName = str(d.query);
      const args = parseJson(d.args, 'args', []);
      if (!workflowId || !queryName) return { ok: false, error: 'workflow_id et query requis.' };
      if (!Array.isArray(args)) return { ok: false, error: 'args doit être un tableau JSON.' };

      return withTemporal(opts, async (client) => {
        const out = await getHandle(client, workflowId, runId).query(queryName, ...args);
        return itemResult({ id: workflowId, name: queryName, status: 'ok', result: out }, workflowId);
      });
    }

    if (key === 'temporal_workflow_result') {
      const workflowId = str(d.workflow_id);
      const runId = str(d.run_id || '');
      if (!workflowId) return { ok: false, error: 'workflow_id requis.' };
      const followRuns = d.follow_runs === true;

      return withTemporal(opts, async (client) => {
        const result = await getHandle(client, workflowId, runId).result({ followRuns });
        return itemResult({ id: workflowId, name: workflowId, status: 'completed', result }, workflowId);
      });
    }

    if (key === 'temporal_workflow_cancel') {
      const workflowId = str(d.workflow_id);
      const runId = str(d.run_id || '');
      if (!workflowId) return { ok: false, error: 'workflow_id requis.' };

      return withTemporal(opts, async (client) => {
        await getHandle(client, workflowId, runId).cancel();
        return actionResult('Workflow annulé.', { workflowId, runId });
      });
    }

    if (key === 'temporal_workflow_terminate') {
      const workflowId = str(d.workflow_id);
      const runId = str(d.run_id || '');
      const reason = str(d.reason || 'Terminé depuis Kinn');
      if (!workflowId) return { ok: false, error: 'workflow_id requis.' };

      return withTemporal(opts, async (client) => {
        await getHandle(client, workflowId, runId).terminate(reason);
        return actionResult('Workflow terminé.', { workflowId, runId, reason });
      });
    }

    if (key === 'temporal_schedule_list') {
      const query = str(d.query || '');
      const pageSize = Math.max(1, Math.min(1000, toNum(d.page_size, 50)));

      return withTemporal(opts, async (client) => {
        if (!client.schedule || !client.schedule.list) {
          return { ok: false, error: 'API schedule non disponible sur la version du SDK Temporal installée.' };
        }
        const iter = client.schedule.list(query ? { query, pageSize } : { pageSize });
        const items = [];
        for await (const s of iter) {
          items.push({
            id: str(s.scheduleId || s.id || ''),
            name: str(s.scheduleId || s.id || ''),
            url: '',
            status: str((s.info && s.info.recentActions && s.info.recentActions.length) ? 'active' : ''),
            created_at: str((s.info && s.info.createTime) || ''),
            updated_at: str((s.info && s.info.updateTime) || ''),
            raw: s
          });
          if (items.length >= pageSize) break;
        }
        return listResult(items);
      });
    }

    if (key === 'temporal_schedule_create') {
      const scheduleId = str(d.schedule_id);
      const spec = parseJson(d.spec, 'spec', null);
      const actionInput = parseJson(d.action, 'action', null);
      if (!scheduleId || !spec || !actionInput) {
        return { ok: false, error: 'schedule_id, spec et action requis.' };
      }

      return withTemporal(opts, async (client) => {
        if (!client.schedule || !client.schedule.create) {
          return { ok: false, error: 'API schedule non disponible sur la version du SDK Temporal installée.' };
        }
        const handle = await client.schedule.create({ scheduleId, spec, action: actionInput });
        return itemResult({ id: scheduleId, name: scheduleId, status: 'created', raw: { scheduleId, handle: !!handle } }, scheduleId);
      });
    }

    if (key === 'temporal_schedule_describe') {
      const scheduleId = str(d.schedule_id);
      if (!scheduleId) return { ok: false, error: 'schedule_id requis.' };

      return withTemporal(opts, async (client) => {
        if (!client.schedule || !client.schedule.getHandle) {
          return { ok: false, error: 'API schedule non disponible sur la version du SDK Temporal installée.' };
        }
        const desc = await client.schedule.getHandle(scheduleId).describe();
        return itemResult({ id: scheduleId, name: scheduleId, status: 'ok', raw: desc }, scheduleId);
      });
    }

    if (key === 'temporal_schedule_update') {
      const scheduleId = str(d.schedule_id);
      const updatePayload = parseJson(d.update, 'update', null);
      if (!scheduleId || !updatePayload) return { ok: false, error: 'schedule_id et update requis.' };

      return withTemporal(opts, async (client) => {
        if (!client.schedule || !client.schedule.getHandle) {
          return { ok: false, error: 'API schedule non disponible sur la version du SDK Temporal installée.' };
        }
        const handle = client.schedule.getHandle(scheduleId);
        try {
          await handle.update(updatePayload);
        } catch {
          await handle.update(() => updatePayload);
        }
        return actionResult('Schedule mis à jour.', { scheduleId });
      });
    }

    if (key === 'temporal_schedule_delete') {
      const scheduleId = str(d.schedule_id);
      if (!scheduleId) return { ok: false, error: 'schedule_id requis.' };

      return withTemporal(opts, async (client) => {
        if (!client.schedule || !client.schedule.getHandle) {
          return { ok: false, error: 'API schedule non disponible sur la version du SDK Temporal installée.' };
        }
        await client.schedule.getHandle(scheduleId).delete();
        return actionResult('Schedule supprimé.', { scheduleId });
      });
    }

    if (key === 'temporal_schedule_trigger') {
      const scheduleId = str(d.schedule_id);
      const overlap = str(d.overlap || '');
      if (!scheduleId) return { ok: false, error: 'schedule_id requis.' };

      return withTemporal(opts, async (client) => {
        if (!client.schedule || !client.schedule.getHandle) {
          return { ok: false, error: 'API schedule non disponible sur la version du SDK Temporal installée.' };
        }
        const triggerOpts = overlap ? { overlap } : undefined;
        await client.schedule.getHandle(scheduleId).trigger(triggerOpts);
        return actionResult('Schedule déclenché.', { scheduleId, overlap: overlap || null });
      });
    }

    return { ok: false, error: `Action inconnue: ${key}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run, parseJson } };
