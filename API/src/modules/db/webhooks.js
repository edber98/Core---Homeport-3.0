// Routes API CRUD pour les Webhooks Kinn.
//
//   GET    /api/workspaces/:wsId/webhooks         — liste
//   POST   /api/workspaces/:wsId/webhooks         — création (le secret n'est
//                                                   retourné qu'ICI, jamais après)
//   GET    /api/webhooks/:id                      — détails (secret masqué)
//   PUT    /api/webhooks/:id                      — update partiel
//   DELETE /api/webhooks/:id                      — suppression
//   POST   /api/webhooks/:id/test                 — envoie un event "test" pour
//                                                   vérifier que le receiver répond
//   GET    /api/webhooks/events                   — liste des events disponibles

const express = require('express');
const { Types } = require('mongoose');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Webhook = require('../../db/models/webhook.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const { dispatchEvent, deliverDirect } = require('../../services/webhook-dispatcher');

module.exports = function () {
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  // Liste des events disponibles (utile pour l'UI)
  r.get('/webhooks/events', (req, res) => {
    res.apiOk({ events: Webhook.WEBHOOK_EVENTS });
  });

  // Helper : résout un workspace par id (ObjectId ou short id) + check membership
  async function resolveWorkspace(req, res, wsIdRaw) {
    let ws;
    if (Types.ObjectId.isValid(String(wsIdRaw))) ws = await Workspace.findById(wsIdRaw);
    else ws = await Workspace.findOne({ id: wsIdRaw });
    if (!ws || String(ws.companyId) !== req.user.companyId) {
      res.apiError(404, 'workspace_not_found', 'Workspace not found');
      return null;
    }
    if (req.user.role !== 'admin') {
      const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
      if (!member) {
        res.apiError(403, 'not_a_member', 'Not a workspace member');
        return null;
      }
    }
    return ws;
  }

  // Helper : sanitize le webhook avant retour (masque le secret)
  function publicWebhook(w, includeSecret = false) {
    const obj = w.toObject ? w.toObject() : w;
    if (!includeSecret) {
      // Affiche un suffixe pour aider à l'identifier sans révéler la valeur
      obj.secret = obj.secret ? `••••••${String(obj.secret).slice(-4)}` : '';
    }
    return obj;
  }

  // ── List webhooks d'un workspace ─────────────────────────────────────
  r.get('/workspaces/:wsId/webhooks', async (req, res) => {
    const ws = await resolveWorkspace(req, res, req.params.wsId);
    if (!ws) return;
    const list = await Webhook.find({ workspaceId: ws._id }).sort({ createdAt: -1 }).lean();
    res.apiOk(list.map(w => publicWebhook(w, false)));
  });

  // ── Create webhook ──────────────────────────────────────────────────
  r.post('/workspaces/:wsId/webhooks', async (req, res) => {
    const ws = await resolveWorkspace(req, res, req.params.wsId);
    if (!ws) return;

    const { name, description, url, events, filters, active } = req.body || {};

    if (!url || typeof url !== 'string') {
      return res.apiError(400, 'invalid_url', 'url HTTPS requise');
    }
    if (!/^https?:\/\//i.test(url)) {
      return res.apiError(400, 'invalid_url', 'url doit commencer par http(s)://');
    }
    if (!Array.isArray(events) || events.length === 0) {
      return res.apiError(400, 'invalid_events', 'events doit être un tableau non vide');
    }
    const invalidEvents = events.filter(e => !Webhook.WEBHOOK_EVENTS.includes(e));
    if (invalidEvents.length) {
      return res.apiError(400, 'unknown_events', `Events inconnus : ${invalidEvents.join(', ')}`);
    }

    const secret = Webhook.generateSecret();
    const webhook = await Webhook.create({
      workspaceId: ws._id,
      companyId: ws.companyId,
      name: String(name || '').slice(0, 200),
      description: String(description || ''),
      url,
      events,
      filters: filters || {},
      active: active !== false,
      secret,
      createdBy: req.user.id,
    });

    // À LA CRÉATION SEULEMENT, on retourne le secret en clair (l'user doit le
    // copier maintenant, sinon il faudra le régénérer).
    res.apiOk({ ...publicWebhook(webhook, true), _secretShownOnce: true });
  });

  // ── Get details ─────────────────────────────────────────────────────
  r.get('/webhooks/:id', async (req, res) => {
    const w = await Webhook.findOne({
      $or: [{ id: req.params.id }, ...(Types.ObjectId.isValid(req.params.id) ? [{ _id: req.params.id }] : [])],
    });
    if (!w) return res.apiError(404, 'not_found', 'Webhook introuvable');
    const ws = await Workspace.findById(w.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'not_found', 'Webhook introuvable');
    res.apiOk(publicWebhook(w, false));
  });

  // ── Update partiel ──────────────────────────────────────────────────
  r.put('/webhooks/:id', async (req, res) => {
    const w = await Webhook.findOne({
      $or: [{ id: req.params.id }, ...(Types.ObjectId.isValid(req.params.id) ? [{ _id: req.params.id }] : [])],
    });
    if (!w) return res.apiError(404, 'not_found', 'Webhook introuvable');
    const ws = await Workspace.findById(w.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'not_found', 'Webhook introuvable');

    const { name, description, url, events, filters, active } = req.body || {};
    if (name !== undefined) w.name = String(name).slice(0, 200);
    if (description !== undefined) w.description = String(description);
    if (url !== undefined) {
      if (!/^https?:\/\//i.test(url)) return res.apiError(400, 'invalid_url', 'url doit commencer par http(s)://');
      w.url = url;
    }
    if (events !== undefined) {
      if (!Array.isArray(events)) return res.apiError(400, 'invalid_events', 'events doit être un tableau');
      const invalid = events.filter(e => !Webhook.WEBHOOK_EVENTS.includes(e));
      if (invalid.length) return res.apiError(400, 'unknown_events', `Events inconnus : ${invalid.join(', ')}`);
      w.events = events;
    }
    if (filters !== undefined) w.filters = filters;
    if (active !== undefined) w.active = !!active;

    await w.save();
    res.apiOk(publicWebhook(w, false));
  });

  // ── Régénération du secret (rotation) ───────────────────────────────
  r.post('/webhooks/:id/rotate-secret', async (req, res) => {
    const w = await Webhook.findOne({
      $or: [{ id: req.params.id }, ...(Types.ObjectId.isValid(req.params.id) ? [{ _id: req.params.id }] : [])],
    });
    if (!w) return res.apiError(404, 'not_found', 'Webhook introuvable');
    const ws = await Workspace.findById(w.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'not_found', 'Webhook introuvable');

    w.secret = Webhook.generateSecret();
    await w.save();
    res.apiOk({ ...publicWebhook(w, true), _secretShownOnce: true });
  });

  // ── Delete ──────────────────────────────────────────────────────────
  r.delete('/webhooks/:id', async (req, res) => {
    const w = await Webhook.findOne({
      $or: [{ id: req.params.id }, ...(Types.ObjectId.isValid(req.params.id) ? [{ _id: req.params.id }] : [])],
    });
    if (!w) return res.apiError(404, 'not_found', 'Webhook introuvable');
    const ws = await Workspace.findById(w.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'not_found', 'Webhook introuvable');
    await Webhook.deleteOne({ _id: w._id });
    res.apiOk({ deleted: true });
  });

  // ── Test : envoie un event factice au receiver pour vérifier qu'il répond
  r.post('/webhooks/:id/test', async (req, res) => {
    const w = await Webhook.findOne({
      $or: [{ id: req.params.id }, ...(Types.ObjectId.isValid(req.params.id) ? [{ _id: req.params.id }] : [])],
    });
    if (!w) return res.apiError(404, 'not_found', 'Webhook introuvable');
    const ws = await Workspace.findById(w.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'not_found', 'Webhook introuvable');

    // Bypass matching et filtres — push direct au webhook visé. Le receiver
    // verra type=webhook.test (ne fait pas partie des events normaux Kinn).
    const testPayload = {
      message: 'Ceci est un event de test envoyé depuis l\'UI Kinn',
      webhookId: w.id,
      webhookName: w.name || '(sans nom)',
      ts: new Date().toISOString(),
    };
    // Fire-and-forget : la delivery + retries tournent en background, on
    // répond immédiatement à l'user qui peut suivre les stats.
    setImmediate(() => deliverDirect(w, 'webhook.test', testPayload)
      .catch(e => console.error('[webhook test] delivery failed:', e?.message)));
    res.apiOk({ ok: true, message: 'Event test envoyé. Vérifie les stats dans 5-10 secondes.' });
  });

  return r;
};
