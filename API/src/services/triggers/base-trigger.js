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
    const flowLabel = this.flow?.id || this.flow?._id || '?';
    this.log.info(`[trigger] event #${this.eventCount} received for flow=${flowLabel} keys=[${Object.keys(rawPayload || {}).join(',')}]`);
    try {
      await this.onEvent(rawPayload);
      this.log.info(`[trigger] event #${this.eventCount} processed OK for flow=${flowLabel}`);
    } catch (e) {
      this.lastError = e.message;
      this.log.error(`[trigger] event #${this.eventCount} execution failed for flow=${flowLabel}: ${e.message}`);
    }
  }
}

module.exports = { BaseTrigger };
