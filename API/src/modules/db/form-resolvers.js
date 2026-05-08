// Endpoints REST pour résoudre dynamiquement les fields type "resolver".
// POST /api/form-resolvers/resolve  → lit la valeur (sans effet de bord)
// POST /api/form-resolvers/action   → exécute une action (rotate, etc.)

const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const { getResolver, listResolvers } = require('../../services/form-resolvers/registry');
const { loadFlow, assertMember, findNode } = require('../../services/form-resolvers/_helpers');

module.exports = function() {
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  // Liste les resolvers connus (debug/admin)
  r.get('/form-resolvers', (req, res) => {
    res.apiOk({ resolvers: listResolvers() });
  });

  r.post('/form-resolvers/resolve', async (req, res) => {
    try {
      const { resolver, variant, context } = req.body || {};
      if (!resolver) return res.apiError(400, 'bad_request', 'resolver requis');
      const mod = getResolver(String(resolver));
      if (!mod) return res.apiError(404, 'resolver_not_found', `Resolver inconnu: ${resolver}`);
      const ctx = await buildResolverContext(context, req.user);
      const result = await mod.resolve({ ...ctx, variant });
      res.apiOk(result);
    } catch (e) {
      res.apiError(400, 'resolve_failed', e?.message || String(e));
    }
  });

  r.post('/form-resolvers/action', async (req, res) => {
    try {
      const { resolver, action, context } = req.body || {};
      if (!resolver) return res.apiError(400, 'bad_request', 'resolver requis');
      if (!action) return res.apiError(400, 'bad_request', 'action requise');
      const mod = getResolver(String(resolver));
      if (!mod || typeof mod.runAction !== 'function') return res.apiError(404, 'resolver_not_found', `Resolver/action inconnu: ${resolver}`);
      const ctx = await buildResolverContext(context, req.user);
      const result = await mod.runAction(ctx, String(action));
      res.apiOk(result);
    } catch (e) {
      res.apiError(400, 'action_failed', e?.message || String(e));
    }
  });

  return r;
};

async function buildResolverContext(context, user) {
  const flowId = String((context || {}).flowId || '').trim();
  const nodeId = String((context || {}).nodeId || '').trim();
  if (!flowId) throw new Error('context.flowId requis');
  if (!nodeId) throw new Error('context.nodeId requis');
  const flow = await loadFlow(flowId);
  if (!flow) throw new Error('Flow introuvable');
  const memberInfo = await assertMember(flow, user);
  // findNode était strict ; on assouplit pour permettre la résolution avant
  // que le node soit sauvegardé en DB (l'utilisateur vient de le déposer).
  // L'entrée httpTriggers est créée immédiatement, et au prochain save du flow
  // un cleanup des orphelins se fera (cf. modules/db/flows.js).
  return { flow, nodeId, user, memberInfo };
}
