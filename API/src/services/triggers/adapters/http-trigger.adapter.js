// HttpTriggerAdapter : adapter dédié au templateKey `core_webhook`.
//
// Différent du WebhookTrigger générique (qui utilise un token flow-level).
// Cet adapter utilise le triggerId persistant stocké dans
// flow.httpTriggers[nodeId].triggerId, et s'enregistre dans le registre
// global http-trigger-listeners pour qu'un seul URL marche en prod ET en test.

const { BaseTrigger } = require('../base-trigger');
const listeners = require('../http-trigger-listeners');

class HttpTriggerAdapter extends BaseTrigger {
  triggerType = 'http';

  async start() {
    const nodeId = this.eventNode?.id;
    const flowId = this.flow?._id;
    if (!flowId || !nodeId) throw new Error('HttpTriggerAdapter: flow + nodeId requis');

    // Récupère le triggerId persistant — auto-create si absent
    const Flow = require('../../../db/models/flow.model');
    let entry = (this.flow.httpTriggers || {})[nodeId];
    if (!entry?.triggerId) {
      const { ensureHttpTriggerEntry } = require('../../form-resolvers/_helpers');
      const flowDoc = await Flow.findById(flowId);
      if (!flowDoc) throw new Error('Flow introuvable');
      entry = await ensureHttpTriggerEntry(flowDoc, nodeId);
      // Sync local pour que l'instance ait l'auth chiffrée à jour
      this.flow.httpTriggers = flowDoc.httpTriggers || {};
      this.flow.httpTriggerIds = flowDoc.httpTriggerIds || [];
    }

    this.triggerId = entry.triggerId;
    this.entry = entry;
    listeners.register(this.triggerId, this);
    this.active = true;
    this.startedAt = new Date();
    this.log.info?.(`[http-trigger] listening triggerId=${this.triggerId} flow=${String(flowId)} node=${nodeId}`);
  }

  async stop() {
    if (this.triggerId) listeners.unregister(this.triggerId);
    this.active = false;
    this.log.info?.(`[http-trigger] stopped triggerId=${this.triggerId || '?'}`);
  }
}

module.exports = { HttpTriggerAdapter };
