const crypto = require('crypto');
const { BaseTrigger } = require('./base-trigger');
const { WEBHOOK_BASE_URL } = require('../../config/env');
const Flow = require('../../db/models/flow.model');

class WebhookTrigger extends BaseTrigger {
  triggerType = 'webhook';

  async start() {
    if (!this.flow.webhookToken) {
      this.flow.webhookToken = crypto.randomUUID();
      await Flow.updateOne({ _id: this.flow._id }, { webhookToken: this.flow.webhookToken });
    }
    this.webhookToken = this.flow.webhookToken;
    this.webhookUrl = `${WEBHOOK_BASE_URL}/api/hooks/${this.flow.webhookToken}`;
    this.active = true;
    this.startedAt = new Date();
    this.log.info(`[webhook] registered: ${this.webhookUrl}`);
  }

  async stop() {
    this.active = false;
    this.log.info(`[webhook] unregistered: ${this.webhookUrl}`);
  }

  getStatus() {
    return { ...super.getStatus(), webhookUrl: this.webhookUrl };
  }
}

module.exports = { WebhookTrigger };
