const { resolveAdapter } = require('./adapter-registry');

function normalizeTemplateKey(k) {
  if (!k) return '';
  let s = String(k).trim().toLowerCase();
  s = s.replace(/^tmpl_/, '').replace(/^template_/, '').replace(/^fn_/, '').replace(/^node_/, '');
  s = s.replace(/[^a-z0-9_]/g, '_');
  return s;
}

/**
 * Start a temporary trigger adapter, wait for exactly 1 event, then stop.
 * Used by test/dev runs to get real event data before continuing the flow.
 *
 * @param {Object} eventNode - The event node from the graph
 * @param {Object} credentials - Decrypted credential values
 * @param {Object} [opts] - Options
 * @param {number} [opts.timeoutMs=120000] - Max wait time (default 2 min)
 * @param {Function} [opts.onWaiting] - Called when adapter is ready and waiting
 * @param {Object} [opts.flow] - Flow document (needed for webhook adapter)
 * @returns {Promise<Object>} The raw event payload
 */
async function waitForOneEvent(eventNode, credentials, opts = {}) {
  const timeoutMs = opts.timeoutMs || 120000;

  // Resolve template key → adapter
  const tObj = eventNode.data?.model?.templateObj || eventNode.model?.templateObj || {};
  const rawKey = eventNode.data?.model?.template || eventNode.model?.template || tObj.id || '';
  const templateKey = normalizeTemplateKey(rawKey);

  const adapterEntry = resolveAdapter(templateKey);
  if (!adapterEntry) {
    throw new Error(`No trigger adapter for '${templateKey}' — cannot wait for event`);
  }

  console.log(`[wait-for-event] starting adapter for '${templateKey}' (timeout=${timeoutMs}ms)`);

  return new Promise((resolve, reject) => {
    let settled = false;
    let trigger = null;
    let timer = null;

    const cleanup = async () => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (trigger) {
        try { await trigger.stop(); } catch (e) {
          console.warn(`[wait-for-event] stop error: ${e.message}`);
        }
        trigger = null;
      }
    };

    // onEvent callback: resolve on first event
    const onEvent = async (rawPayload) => {
      if (settled) return;
      settled = true;
      console.log(`[wait-for-event] received event for '${templateKey}'`);
      await cleanup();
      resolve(rawPayload);
    };

    // Timeout
    timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      console.warn(`[wait-for-event] timeout after ${timeoutMs}ms for '${templateKey}'`);
      await cleanup();
      reject(new Error(`Timeout: aucun événement reçu après ${Math.round(timeoutMs / 1000)}s pour '${templateKey}'`));
    }, timeoutMs);

    // Create and start the adapter
    (async () => {
      try {
        trigger = new adapterEntry.Adapter({
          flow: opts.flow || {},
          eventNode,
          credentials: credentials || {},
          onEvent,
          logger: console,
        });

        await trigger.start();
        console.log(`[wait-for-event] adapter started, waiting for 1 event...`);

        // Notify caller that we're now listening
        if (opts.onWaiting) {
          try { opts.onWaiting({ templateKey, triggerType: adapterEntry.type, webhookUrl: trigger.webhookUrl }); } catch {}
        }
      } catch (e) {
        if (settled) return;
        settled = true;
        if (timer) { clearTimeout(timer); timer = null; }
        reject(new Error(`Failed to start trigger adapter '${templateKey}': ${e.message}`));
      }
    })();
  });
}

module.exports = { waitForOneEvent };
