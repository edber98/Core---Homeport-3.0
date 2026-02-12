class BaseTrigger {
  constructor({ flow, eventNode, credentials, onEvent, logger }) {
    this.flow = flow;
    this.eventNode = eventNode;
    this.credentials = credentials || {};
    this.onEvent = onEvent;
    this.log = logger || console;

    this.active = false;
    this.startedAt = null;
    this.lastEventAt = null;
    this.eventCount = 0;
    this.lastError = null;
  }

  async start() { throw new Error('Not implemented'); }
  async stop()  { throw new Error('Not implemented'); }

  getStatus() {
    return {
      active: this.active,
      triggerType: this.triggerType,
      startedAt: this.startedAt,
      lastEventAt: this.lastEventAt,
      eventCount: this.eventCount,
      lastError: this.lastError,
    };
  }

  async _emit(rawPayload) {
    this.eventCount++;
    this.lastEventAt = new Date();
    try {
      await this.onEvent(rawPayload);
    } catch (e) {
      this.lastError = e.message;
      this.log.error(`[trigger] execution failed: ${e.message}`);
    }
  }
}

module.exports = { BaseTrigger };
