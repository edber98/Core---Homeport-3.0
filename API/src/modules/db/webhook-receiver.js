const express = require('express');
const { triggerManager } = require('../../services/trigger-manager');

module.exports = function () {
  const r = express.Router();

  // POST /api/hooks/:token — receive webhook payload
  r.post('/:token', async (req, res) => {
    try {
      const result = await triggerManager.handleWebhook(req.params.token, req.body, req.headers);
      if (!result) return res.status(404).json({ error: 'Webhook not found or flow not active' });
      res.json({ ok: true, flowId: result.flowId });
    } catch (e) {
      console.error(`[webhook-receiver] error: ${e.message}`);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // GET /api/hooks/:token — handle verification challenges (Telegram, Facebook, etc.)
  r.get('/:token', (req, res) => {
    const challenge = req.query['hub.challenge'] || req.query.challenge;
    if (challenge) return res.send(challenge);
    res.json({ ok: true });
  });

  return r;
};
