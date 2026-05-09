const { TelegramAdapter } = require('./adapters/telegram.adapter');
const { ImapAdapter } = require('./adapters/imap.adapter');
const { MongoDBAdapter } = require('./adapters/mongodb.adapter');
const { KinnWebhookAdapter } = require('./adapters/kinn-webhook.adapter');
const { CronAdapter } = require('./adapters/cron.adapter');
const { HttpTriggerAdapter } = require('./adapters/http-trigger.adapter');
const { WebhookTrigger } = require('./webhook-trigger');

// Mapping templateKey → { Adapter, type }
const registry = {
  // Subscription adapters (persistent connection)
  'tg_webhook_event':       { Adapter: TelegramAdapter,  type: 'subscription' },
  'email_new_message':      { Adapter: ImapAdapter,       type: 'subscription' },
  'mongo_change_stream':    { Adapter: MongoDBAdapter,    type: 'subscription' },

  // Kinn auto-référence : un Homeport déployé peut s'abonner aux events d'un
  // Kinn distant (run/thread/deployment). L'adapter s'auto-enregistre comme
  // webhook côté Kinn distant au start et désinscrit au stop.
  'kinn_on_run_complete':       { Adapter: KinnWebhookAdapter, type: 'subscription' },
  'kinn_on_thread_message':     { Adapter: KinnWebhookAdapter, type: 'subscription' },
  'kinn_on_deployment_event':   { Adapter: KinnWebhookAdapter, type: 'subscription' },

  // Cron (in-process, croner)
  'cron_schedule':              { Adapter: CronAdapter,        type: 'cron' },

  // HTTP trigger entrant (per-node persistent triggerId, /api/trigger/:triggerId)
  'core_webhook':           { Adapter: HttpTriggerAdapter, type: 'http' },

  // Webhook adapters legacy (URL-based, /api/hooks/:flowToken)
  'discord_webhook_event':  { Adapter: WebhookTrigger,    type: 'webhook' },
  'jira_webhook_event':     { Adapter: WebhookTrigger,    type: 'webhook' },
  'shopify_webhook_event':  { Adapter: WebhookTrigger,    type: 'webhook' },
  'wc_webhook_event':       { Adapter: WebhookTrigger,    type: 'webhook' },
  'calendly_webhook_event': { Adapter: WebhookTrigger,    type: 'webhook' },
  'asana_webhook_event':    { Adapter: WebhookTrigger,    type: 'webhook' },
  'linear_webhook_event':   { Adapter: WebhookTrigger,    type: 'webhook' },
  'clickup_webhook_event':  { Adapter: WebhookTrigger,    type: 'webhook' },
  'brevo_webhook_event':    { Adapter: WebhookTrigger,    type: 'webhook' },
  'mc_webhook_event':       { Adapter: WebhookTrigger,    type: 'webhook' },
  'intercom_webhook_event': { Adapter: WebhookTrigger,    type: 'webhook' },
  'salesforce_webhook_event': { Adapter: WebhookTrigger,  type: 'webhook' },
  'typeform_webhook_event': { Adapter: WebhookTrigger,    type: 'webhook' },
  'whatsapp_webhook_event': { Adapter: WebhookTrigger,    type: 'webhook' },
  'github_webhook_event':   { Adapter: WebhookTrigger,    type: 'webhook' },
  'stripe_webhook_event':   { Adapter: WebhookTrigger,    type: 'webhook' },
  'airtable_webhook_event': { Adapter: WebhookTrigger,    type: 'webhook' },
  'notion_webhook_event':   { Adapter: WebhookTrigger,    type: 'webhook' },
  'hubspot_webhook_event':  { Adapter: WebhookTrigger,    type: 'webhook' },
};

/**
 * Resolve adapter entry for a given template key.
 * Falls back to WebhookTrigger for any key ending with _webhook_event.
 */
function resolveAdapter(templateKey) {
  const entry = registry[templateKey];
  if (entry) return entry;
  if (templateKey.endsWith('_webhook_event')) return { Adapter: WebhookTrigger, type: 'webhook' };
  return null;
}

module.exports = { registry, resolveAdapter };
