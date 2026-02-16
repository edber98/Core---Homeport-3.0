const { BaseTrigger } = require('./base-trigger');

class SubscriptionTrigger extends BaseTrigger {
  triggerType = 'subscription';

  async start() {
    await this._connect();
    this.active = true;
    this.startedAt = new Date();
  }

  async stop() {
    this.active = false;
    await this._disconnect();
  }

  async _connect()    { throw new Error('Implement _connect'); }
  async _disconnect() { throw new Error('Implement _disconnect'); }
}

module.exports = { SubscriptionTrigger };
