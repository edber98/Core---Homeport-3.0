const Flow = require('../db/models/flow.model');
const Workspace = require('../db/models/workspace.model');
const Run = require('../db/models/run.model');
const Attempt = require('../db/models/attempt.model');
const AttemptCounter = require('../db/models/attempt-counter.model');
const RunEvent = require('../db/models/run-event.model');
const Credential = require('../db/models/credential.model');
const { Types } = require('mongoose');
const { decrypt } = require('../utils/enc');
const { runFlow } = require('../engine');
const { broadcast } = require('../realtime/ws');
const { broadcastRun } = require('../realtime/socketio');
const { createFilesHelper } = require('./file-storage');
const { resolveAdapter } = require('./triggers/adapter-registry');

function normalizeTemplateKey(k) {
  if (!k) return '';
  let s = String(k).trim().toLowerCase();
  s = s.replace(/^tmpl_/, '').replace(/^template_/, '').replace(/^fn_/, '').replace(/^node_/, '');
  s = s.replace(/[^a-z0-9_]/g, '_');
  return s;
}

function isResultError(result) {
  return !!(result && typeof result === 'object' && (result.ok === false || result.error != null));
}

class TriggerManager {
  constructor() {
    this.activeTriggers = new Map(); // flowId → TriggerInstance
  }

  // ── Restore all production flows at server boot ──────
  async startAll() {
    const flows = await Flow.find({ status: 'production', enabled: true });
    let restored = 0;
    for (const flow of flows) {
      try {
        await this.deployFlow(flow._id, { silent: true });
        restored++;
      } catch (e) {
        console.error(`[trigger-manager] failed to restore flow ${flow.id || flow._id}: ${e.message}`);
      }
    }
    console.log(`[trigger-manager] restored ${restored}/${flows.length} triggers`);
  }

  // ── Deploy a flow ────────────────────────────────────
  async deployFlow(flowId, opts = {}) {
    const flow = await Flow.findById(flowId);
    if (!flow) throw new Error('Flow not found');
    if (this.activeTriggers.has(String(flow._id))) {
      throw new Error('Flow already deployed');
    }

    // Find event node
    const eventNode = this._findEventNode(flow.graph);
    if (!eventNode) throw new Error('No event trigger node found in flow');
    console.log(`[trigger-manager] deploy: found event node ${eventNode.id}`);

    // Resolve template key → adapter
    const tObj = eventNode.data?.model?.templateObj || {};
    const templateKey = normalizeTemplateKey(
      eventNode.data?.model?.template || tObj.id || ''
    );
    console.log(`[trigger-manager] deploy: templateKey='${templateKey}' raw='${eventNode.data?.model?.template || tObj.id || ''}'`);
    const adapterEntry = resolveAdapter(templateKey);
    if (!adapterEntry) throw new Error(`No trigger adapter for '${templateKey}'`);
    console.log(`[trigger-manager] deploy: adapter type=${adapterEntry.type}`);

    // Decrypt credentials
    let credentials = {};
    const credId = String(eventNode.data?.model?.credentialId || '');
    console.log(`[trigger-manager] deploy: credentialId='${credId}'`);
    if (credId && credId !== 'undefined' && credId !== 'null' && credId !== '') {
      try {
        let cred = null;
        if (Types.ObjectId.isValid(credId)) cred = await Credential.findById(credId).lean();
        if (!cred) cred = await Credential.findOne({ id: credId }).lean();
        if (cred) credentials = decrypt(cred.secret);
      } catch (e) {
        console.warn(`[trigger-manager] credential decrypt failed: ${e.message}`);
      }
    }

    // Create onEvent callback
    const onEvent = async (rawPayload) => {
      await this._executeFlow(flow, eventNode, rawPayload);
    };

    // Instantiate and start adapter
    console.log(`[trigger-manager] deploy: credentials keys=[${Object.keys(credentials).join(',')}]`);
    const trigger = new adapterEntry.Adapter({
      flow, eventNode, credentials, onEvent,
      logger: console,
    });
    console.log(`[trigger-manager] deploy: starting adapter...`);
    await trigger.start();
    console.log(`[trigger-manager] deploy: adapter started OK`);

    // Save state
    this.activeTriggers.set(String(flow._id), trigger);
    await Flow.updateOne({ _id: flow._id }, {
      status: 'production',
      deployedAt: new Date(),
      triggerType: adapterEntry.type,
      triggerNodeId: eventNode.id,
      webhookToken: trigger.webhookToken || flow.webhookToken || null,
    });

    if (!opts.silent) {
      console.log(`[trigger-manager] deployed flow ${flow.id || flow._id} (${adapterEntry.type})`);
    }

    return trigger.getStatus();
  }

  // ── Undeploy a flow ──────────────────────────────────
  async undeployFlow(flowId) {
    const key = String(flowId);
    const trigger = this.activeTriggers.get(key);
    if (trigger) {
      await trigger.stop();
      this.activeTriggers.delete(key);
    }
    await Flow.updateOne(
      { _id: flowId },
      { status: 'draft', deployedAt: null, triggerType: null, triggerNodeId: null }
    );
    console.log(`[trigger-manager] undeployed flow ${flowId}`);
  }

  // ── Handle incoming webhook ──────────────────────────
  async handleWebhook(webhookToken, payload, headers) {
    const flow = await Flow.findOne({ webhookToken, status: 'production' });
    if (!flow) return null;

    const trigger = this.activeTriggers.get(String(flow._id));
    if (!trigger || !trigger.active) return null;

    await trigger._emit({
      body: payload,
      headers: headers || {},
    });
    return { flowId: String(flow._id), triggered: true };
  }

  // ── Execute flow on event ────────────────────────────
  async _executeFlow(flow, eventNode, rawPayload) {
    const freshFlow = await Flow.findById(flow._id);
    if (!freshFlow || freshFlow.status !== 'production') return;

    const ws = await Workspace.findById(freshFlow.workspaceId);
    if (!ws) { console.error(`[trigger-manager] workspace not found for flow ${flow._id}`); return; }

    const now = new Date();
    let graphSnapshot = {};
    try { graphSnapshot = JSON.parse(JSON.stringify(freshFlow.graph || {})); } catch { graphSnapshot = freshFlow.graph || {}; }

    const trigger = this.activeTriggers.get(String(flow._id));
    const run = await Run.create({
      flowId: freshFlow._id,
      workspaceId: ws._id,
      companyId: ws.companyId,
      status: 'running',
      events: [],
      result: null,
      finalPayload: null,
      startedAt: now,
      graph: graphSnapshot,
      meta: { trigger: true, triggerType: trigger?.triggerType || null },
    });

    const getCredentials = async (node) => {
      try {
        const credId = String(node?.data?.model?.credentialId || node?.model?.credentialId || '');
        if (!credId) return null;
        let cred = null;
        if (Types.ObjectId.isValid(credId)) cred = await Credential.findById(credId).lean();
        if (!cred) cred = await Credential.findOne({ id: credId }).lean();
        if (!cred) return null;
        if (String(cred.workspaceId) !== String(ws._id)) return null;
        const values = decrypt(cred.secret);
        return { id: String(cred._id), providerKey: cred.providerKey, values };
      } catch { return null; }
    };

    const filesHelper = createFilesHelper({ workspaceId: ws._id, companyId: ws.companyId, runId: run._id });
    const initialMsg = { payload: rawPayload };
    let seq = 0;
    let finalMsg = null;

    try {
      await runFlow(freshFlow.graph || freshFlow, { now, getCredentials, files: filesHelper }, initialMsg, async (ev) => {
        const ts = new Date();
        if (ev.type === 'run.started') {
          await Run.updateOne({ _id: run._id }, { $set: { status: 'running' } });
          await RunEvent.create({ runId: run._id, type: 'run.status', seq: ++seq, data: { status: 'running', startedAt: ev.startedAt || ts.toISOString() }, ts });
        }
        if (ev.type === 'node.started') {
          const nodeId = String(ev.nodeId || '');
          const branchId = String(ev.branchId || '');
          const startedAt = ev.startedAt ? new Date(ev.startedAt) : ts;
          let att = await Attempt.findOne({ runId: run._id, nodeId, branchId, finishedAt: { $exists: false } }).sort({ attempt: -1 });
          let usedAttempt = att?.attempt;
          if (!att) {
            const ctr = await AttemptCounter.findOneAndUpdate({ runId: run._id, nodeId }, { $inc: { seq: 1 } }, { upsert: true, new: true });
            usedAttempt = Math.max(1, Number(ctr?.seq || 1));
            att = await Attempt.findOneAndUpdate(
              { runId: run._id, nodeId, attempt: usedAttempt },
              { $setOnInsert: { status: 'running', kind: ev.kind || undefined, templateKey: ev.templateKey || undefined, startedAt, argsPre: ev.argsPre, argsPost: ev.argsPost, input: ev.input, branchId, msgIn: ev.msgIn } },
              { upsert: true, new: true }
            );
          }
          await RunEvent.create({ runId: run._id, type: 'node.status', nodeId, attemptId: att._id, exec: usedAttempt, branchId, seq: ++seq, data: { status: 'running', startedAt, msgIn: ev.msgIn, input: ev.input, argsPre: ev.argsPre, argsPost: ev.argsPost }, ts });
        }
        if (ev.type === 'node.done') {
          const nodeId = String(ev.nodeId || '');
          const branchId = String(ev.branchId || '');
          let att = await Attempt.findOne({ runId: run._id, nodeId, branchId, finishedAt: { $exists: false } }).sort({ attempt: -1 });
          const finishedAt = ev.finishedAt ? new Date(ev.finishedAt) : ts;
          const status = isResultError(ev.result) ? 'error' : 'success';
          const errMsg = isResultError(ev.result) ? (ev.result?.error ? String(ev.result.error) : 'error') : undefined;
          if (att) {
            att.status = status; att.finishedAt = finishedAt;
            att.durationMs = typeof ev.durationMs === 'number' ? ev.durationMs : (att.startedAt ? (finishedAt.getTime() - new Date(att.startedAt).getTime()) : undefined);
            att.argsPost = ev.argsPost; att.input = ev.input; att.msgIn = ev.msgIn; att.msgOut = ev.msgOut; att.result = ev.result;
            await att.save();
            await RunEvent.create({ runId: run._id, type: 'node.result', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { input: ev.input, argsPre: ev.argsPre, result: ev.result, argsPost: ev.argsPost, msgIn: ev.msgIn, msgOut: ev.msgOut, durationMs: att.durationMs, finishedAt }, ts });
            await RunEvent.create({ runId: run._id, type: 'node.status', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { status, finishedAt, durationMs: att.durationMs, error: errMsg }, ts });
          }
        }
        if (ev.type === 'edge.taken') {
          await RunEvent.create({ runId: run._id, type: 'edge.taken', seq: ++seq, data: { sourceId: ev.sourceId, targetId: ev.targetId }, ts });
        }
        // Broadcast for live viewers
        const livePackets = [];
        if (ev.type === 'run.started') livePackets.push({ type: 'run.status', run: { status: 'running' } });
        if (ev.type === 'node.started') livePackets.push({ type: 'node.status', nodeId: ev.nodeId, data: { status: 'running' } });
        if (ev.type === 'node.done') {
          const status = isResultError(ev.result) ? 'error' : 'success';
          livePackets.push({ type: 'node.result', nodeId: ev.nodeId, data: { result: ev.result, durationMs: ev.durationMs } });
          livePackets.push({ type: 'node.status', nodeId: ev.nodeId, data: { status, finishedAt: ev.finishedAt, durationMs: ev.durationMs } });
        }
        if (ev.type === 'edge.taken') livePackets.push({ type: 'edge.taken', data: { sourceId: ev.sourceId, targetId: ev.targetId } });
        if (ev.type === 'run.completed') { livePackets.push({ type: 'run.status', run: { status: 'success', result: ev.payload } }); finalMsg = ev; }
        for (const pkt of livePackets) { broadcast(String(run._id), pkt); broadcastRun(String(run._id), pkt); }
      });

      const doc = await Run.findById(run._id);
      doc.status = 'success';
      doc.result = finalMsg?.payload ?? null;
      doc.finalPayload = doc.result;
      doc.finishedAt = new Date();
      doc.durationMs = doc.startedAt ? (doc.finishedAt.getTime() - doc.startedAt.getTime()) : undefined;
      await doc.save();
      try { await RunEvent.create({ runId: run._id, type: 'run.status', seq: ++seq, data: { status: 'success', result: doc.result }, ts: new Date() }); } catch {}
      console.log(`[trigger-manager] run completed: runId=${String(run._id)} flowId=${String(flow._id)}`);
    } catch (e) {
      const doc = await Run.findById(run._id);
      doc.status = 'error';
      doc.finishedAt = new Date();
      doc.durationMs = doc.startedAt ? (doc.finishedAt.getTime() - doc.startedAt.getTime()) : undefined;
      await doc.save();
      let last = await RunEvent.findOne({ runId: run._id }).sort({ seq: -1 }).lean();
      const nextSeq = (last && typeof last.seq === 'number' ? last.seq : 0) + 1;
      await RunEvent.create({ runId: run._id, type: 'run.status', seq: nextSeq, data: { status: 'error', error: e?.message || String(e) }, ts: new Date() });
      const pkt = { type: 'run.status', run: { status: 'error', error: e?.message || String(e) } };
      broadcast(String(run._id), pkt);
      broadcastRun(String(run._id), pkt);
      console.error(`[trigger-manager] run failed: runId=${String(run._id)} error=${e?.message || e}`);
    }
  }

  // ── Find event node in graph ─────────────────────────
  _findEventNode(graph) {
    const nodes = graph?.nodes || [];
    return nodes.find(n => {
      const tObj = n.data?.model?.templateObj || {};
      const type = (tObj.type || tObj.nodeKind || '').toLowerCase();
      return type === 'event';
    });
  }

  getStatus(flowId) {
    const trigger = this.activeTriggers.get(String(flowId));
    return trigger ? trigger.getStatus() : { active: false };
  }

  listActive() {
    return [...this.activeTriggers.entries()].map(([fid, t]) => ({
      flowId: fid, ...t.getStatus(),
    }));
  }

  listActiveByWorkspace(workspaceId) {
    const wsId = String(workspaceId);
    return [...this.activeTriggers.entries()]
      .filter(([_, t]) => String(t.flow?.workspaceId) === wsId)
      .map(([fid, t]) => ({ flowId: fid, ...t.getStatus() }));
  }

  async shutdown() {
    for (const [, trigger] of this.activeTriggers) {
      try { await trigger.stop(); } catch {}
    }
    this.activeTriggers.clear();
    console.log('[trigger-manager] all triggers stopped');
  }
}

const triggerManager = new TriggerManager();
module.exports = { triggerManager };
