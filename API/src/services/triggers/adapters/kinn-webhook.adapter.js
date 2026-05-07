// Kinn Webhook Adapter — s'inscrit automatiquement comme webhook auprès d'un
// Kinn distant au démarrage du flow déployé, reçoit les events sur un endpoint
// local Homeport (`/api/webhooks/receive/:relayId`), vérifie la signature HMAC
// et émet l'event au flow.
//
// Couvre les 3 nodes Kinn de type event :
//   - kinn_on_run_complete
//   - kinn_on_thread_message
//   - kinn_on_deployment_event

const crypto = require('crypto');
const { SubscriptionTrigger } = require('../subscription-trigger');
const { kinnWebhookRegistry } = require('../kinn-webhook-registry');

// Mapping templateKey → events Kinn auxquels s'abonner côté distant
const TEMPLATE_TO_EVENTS = {
  kinn_on_run_complete: ['run.completed', 'run.failed', 'run.cancelled'],
  kinn_on_thread_message: ['thread.message.created'],
  kinn_on_deployment_event: ['deployment.event'],
};

class KinnWebhookAdapter extends SubscriptionTrigger {
  constructor(opts) {
    super(opts);
    this.relayId = null;          // identifiant unique de ce trigger (route receiver)
    this.remoteWebhookId = null;  // id du webhook créé côté Kinn distant
    this.localSecret = null;      // secret partagé avec Kinn distant
    this._unregister = null;      // teardown du listener local
  }

  async _connect() {
    const { baseUrl, apiToken, workspaceId: credWsId } = this.credentials;
    if (!baseUrl) throw new Error('Kinn baseUrl manquant dans les credentials');
    if (!apiToken) throw new Error('Kinn apiToken manquant');

    const cleanBase = String(baseUrl).replace(/\/+$/, '');
    const templateKey = this._templateKey();
    const events = TEMPLATE_TO_EVENTS[templateKey] || [];
    if (events.length === 0) {
      throw new Error(`Aucun event Kinn mappé pour le template '${templateKey}'`);
    }

    // Détermine le workspace côté Kinn distant
    const wsId = this._argModelValue('workspaceId') || credWsId;
    if (!wsId) throw new Error('workspaceId requis (dans les args du node ou les credentials)');

    // 1. Génère un relayId + secret unique pour ce trigger
    this.relayId = `kwh_${crypto.randomBytes(8).toString('hex')}`;
    this.localSecret = crypto.randomBytes(32).toString('hex');

    // 2. Construit l'URL receiver (où Kinn distant push)
    const publicBase = String(process.env.HOMEPORT_PUBLIC_URL || process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5055}`).replace(/\/+$/, '');
    const receiverUrl = `${publicBase}/api/webhooks/receive/${this.relayId}`;

    // 3. Filtres optionnels venant des args du node
    const filters = {};
    const flowIdFilter = this._argModelValue('flowId');
    if (flowIdFilter) filters.flowIds = [String(flowIdFilter)];
    const threadIdFilter = this._argModelValue('threadId');
    if (threadIdFilter) filters.threadIds = [String(threadIdFilter)];
    const statusFilter = this._argModelValue('statusFilter');
    if (statusFilter) filters.runStatuses = [String(statusFilter)];

    // 4. POST sur Kinn distant pour créer le webhook
    const flowLabel = this.flow?.id || this.flow?._id || 'unknown';
    const createBody = {
      name: `[Homeport] flow ${flowLabel} — ${templateKey}`,
      description: `Webhook auto-créé par l'adapter Kinn pour le node ${templateKey}`,
      url: receiverUrl,
      events,
      filters,
      active: true,
    };

    this.log.info(`[kinn-webhook] register on ${cleanBase} for events=[${events.join(',')}]`);
    const res = await fetch(`${cleanBase}/api/workspaces/${encodeURIComponent(wsId)}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBody),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Kinn webhook register failed (${res.status}): ${errText.slice(0, 300)}`);
    }
    const created = await res.json();
    const webhook = created?.data || created;
    this.remoteWebhookId = webhook.id;
    // Le secret retourné par Kinn distant sert à signer les payloads. C'est lui
    // qu'on doit utiliser pour vérifier la signature reçue, pas notre localSecret.
    this.localSecret = webhook.secret || this.localSecret;
    this.log.info(`[kinn-webhook] registered remote webhook ${this.remoteWebhookId}`);

    // 5. Enregistre un listener local sur le relayId — la route receiver
    // appellera onEvent() quand un POST signé arrive.
    this._unregister = kinnWebhookRegistry.register(this.relayId, {
      secret: this.localSecret,
      onEvent: (envelope) => this._onEventReceived(envelope),
      flowLabel,
      events,
    });
  }

  async _disconnect() {
    if (this._unregister) {
      try { this._unregister(); } catch {}
      this._unregister = null;
    }
    // DELETE le webhook côté Kinn distant pour nettoyer
    if (this.remoteWebhookId) {
      try {
        const cleanBase = String(this.credentials.baseUrl || '').replace(/\/+$/, '');
        const res = await fetch(`${cleanBase}/api/webhooks/${encodeURIComponent(this.remoteWebhookId)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.credentials.apiToken || ''}` },
        });
        if (res.ok) {
          this.log.info(`[kinn-webhook] unregistered remote webhook ${this.remoteWebhookId}`);
        } else {
          this.log.warn(`[kinn-webhook] unregister failed (${res.status})`);
        }
      } catch (e) {
        this.log.warn(`[kinn-webhook] unregister error: ${e.message}`);
      }
      this.remoteWebhookId = null;
    }
    this.relayId = null;
    this.localSecret = null;
  }

  /** Appelé par le receiver après vérification de signature. */
  async _onEventReceived(envelope) {
    // envelope = { id, event, timestamp, workspaceId, payload }
    // On émet le payload sans la signature (déjà vérifiée). Le handler du node
    // (kinn_on_run_complete par ex) recevra { ...payload } via msg.payload.
    await this._emit({
      ...envelope.payload,
      _eventType: envelope.event,
      _eventId: envelope.id,
      _eventTimestamp: envelope.timestamp,
    });
  }

  /** Récupère la valeur d'un arg du node template (model.context). */
  _argModelValue(key) {
    const ctx = this.eventNode?.model?.context || this.eventNode?.data?.model?.context || {};
    const v = ctx[key];
    return v === undefined || v === null || v === '' ? null : v;
  }

  /** Récupère la templateKey du node event. */
  _templateKey() {
    return this.eventNode?.data?.model?.template
        || this.eventNode?.model?.template
        || this.eventNode?.data?.model?.templateObj?.key
        || this.eventNode?.model?.templateObj?.key
        || '';
  }
}

module.exports = { KinnWebhookAdapter };
