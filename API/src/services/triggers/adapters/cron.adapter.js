// CronAdapter : déclenche un flow déployé selon une expression cron.
// In-process via croner. À l'undeploy/shutdown, le job est .stop()'é
// proprement — pas de leak.

const { Cron } = require('croner');
const { BaseTrigger } = require('../base-trigger');

class CronAdapter extends BaseTrigger {
  triggerType = 'cron';

  async start() {
    // Lit l'expression cron depuis les args du node : node.data.model.context.expression
    const ctx = (this.eventNode?.data?.model?.context) || {};
    const expression = String(ctx.expression || ctx.cron || '').trim();
    if (!expression) {
      throw new Error('Expression cron manquante (champ "expression" requis)');
    }
    const timezone = String(ctx.timezone || '').trim() || undefined;

    try {
      this.job = new Cron(expression, { timezone, protect: true }, () => {
        const fired = new Date();
        this._emit({ firedAt: fired.toISOString(), expression, timezone: timezone || null })
          .catch((e) => this.log.error?.(`[cron] emit failed: ${e.message}`));
      });
    } catch (e) {
      throw new Error(`Expression cron invalide "${expression}": ${e.message}`);
    }

    this.expression = expression;
    this.timezone = timezone || null;
    this.active = true;
    this.startedAt = new Date();
    this.log.info?.(`[cron] scheduled flow=${this.flow?.id || this.flow?._id} expr="${expression}"${timezone ? ` tz=${timezone}` : ''} next=${this.job.nextRun()?.toISOString?.() || '?'}`);
  }

  async stop() {
    if (this.job) {
      try { this.job.stop(); } catch {}
      this.job = null;
    }
    this.active = false;
    this.log.info?.(`[cron] stopped flow=${this.flow?.id || this.flow?._id}`);
  }

  getStatus() {
    return {
      ...super.getStatus(),
      expression: this.expression || null,
      timezone: this.timezone || null,
      nextRun: this.job?.nextRun?.()?.toISOString?.() || null,
    };
  }
}

module.exports = { CronAdapter };
