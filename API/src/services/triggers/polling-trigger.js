const { BaseTrigger } = require('./base-trigger');
const { registry } = require('../../plugins/registry');

function normalizeTemplateKey(k) {
  if (!k) return '';
  let s = String(k).trim().toLowerCase();
  s = s.replace(/^tmpl_/, '').replace(/^template_/, '').replace(/^fn_/, '').replace(/^node_/, '');
  s = s.replace(/[^a-z0-9_]/g, '_');
  return s;
}

class PollingTrigger extends BaseTrigger {
  triggerType = 'polling';

  async start() {
    const ctx = this.eventNode?.model?.context || this.eventNode?.data?.model?.context || {};
    this.intervalMs = parseInt(ctx.pollingInterval, 10) || 60000;
    this._lastState = null;

    // Initial poll without triggering
    await this._poll(true);

    this._timer = setInterval(() => this._poll(false), this.intervalMs);
    this.active = true;
    this.startedAt = new Date();
    this.log.info(`[polling] started, interval=${this.intervalMs}ms`);
  }

  _getTemplateKey() {
    const tObj = this.eventNode?.model?.templateObj || this.eventNode?.data?.model?.templateObj || {};
    return this.eventNode?.model?.template || this.eventNode?.data?.model?.template || tObj.id || '';
  }

  async _poll(isInitial) {
    try {
      const fn = registry.resolve(normalizeTemplateKey(this._getTemplateKey()));
      if (!fn) return;

      const result = await fn(
        { id: this.eventNode.id, model: this.eventNode.model || this.eventNode.data?.model },
        { payload: this._lastState },
        this.eventNode.model?.context || this.eventNode.data?.model?.context || {},
        { credentials: this.credentials }
      );

      const stateStr = JSON.stringify(result);
      if (!isInitial && stateStr !== JSON.stringify(this._lastState)) {
        await this._emit(result);
      }
      this._lastState = result;
    } catch (e) {
      this.lastError = e.message;
    }
  }

  async stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    this.active = false;
  }
}

module.exports = { PollingTrigger };
