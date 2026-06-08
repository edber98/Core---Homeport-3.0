// Routes "me" : profil utilisateur courant + gestion des PAT.
const express = require('express');
const crypto = require('crypto');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const User = require('../../db/models/user.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const Pat = require('../../db/models/personal-access-token.model');
const panelCredits = require('../../services/panel-credits');

const PAT_PREFIX = 'kpat_';

function generatePatToken() {
  const random = crypto.randomBytes(32).toString('base64url');
  return `${PAT_PREFIX}${random}`;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function safePat(p) {
  return {
    id: String(p._id),
    name: p.name,
    prefix: p.prefix,
    scopes: p.scopes || [],
    lastUsedAt: p.lastUsedAt,
    expiresAt: p.expiresAt,
    revokedAt: p.revokedAt,
    createdAt: p.createdAt,
  };
}

function buildRouter() {
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  // Infos profil + workspaces du user courant
  r.get('/me', async (req, res) => {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.apiError(404, 'user_not_found', 'User not found');
    const memberships = await WorkspaceMembership.find({ userId: user._id }).lean();
    const wsIds = memberships.map(m => m.workspaceId);
    const workspaces = await Workspace.find({ _id: { $in: wsIds } }).lean();
    const wsById = new Map(workspaces.map(w => [String(w._id), w]));
    const wsList = memberships.map(m => {
      const w = wsById.get(String(m.workspaceId));
      return w ? {
        id: String(w._id),
        name: w.name,
        isDefault: !!w.isDefault,
        role: m.role,
      } : null;
    }).filter(Boolean);
    // displayName = name (claim Zitadel) > firstName+lastName > email (fallback)
    const displayName = user.name
      || [user.firstName, user.lastName].filter(Boolean).join(' ')
      || user.email;
    res.apiOk({
      id: String(user._id),
      email: user.email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      name: user.name || null,
      displayName,
      role: user.role,
      kind: user.kind || null,
      groups: user.groups || [],
      companyId: String(user.companyId),
      defaultWorkspaceId: user.defaultWorkspaceId ? String(user.defaultWorkspaceId) : null,
      workspaces: wsList,
    });
  });

  // Liste des PAT du user courant
  r.get('/me/pats', async (req, res) => {
    const list = await Pat.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.apiOk(list.map(safePat));
  });

  // Crée un nouveau PAT — le token clair n'est retourné QUE dans cette réponse
  r.post('/me/pats', async (req, res) => {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) return res.apiError(400, 'bad_request', 'name requis');
    let expiresAt = null;
    if (body.expiresInDays != null) {
      const days = Math.max(1, Math.min(3650, Number(body.expiresInDays) || 0));
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
    const token = generatePatToken();
    const tokenHash = hashToken(token);
    const prefix = token.slice(0, PAT_PREFIX.length + 8);
    const pat = await Pat.create({
      userId: req.user.id,
      name,
      prefix,
      tokenHash,
      scopes: Array.isArray(body.scopes) ? body.scopes.map(String) : [],
      expiresAt,
    });
    res.status(201).json({
      success: true,
      data: { ...safePat(pat), token },
      requestId: req.requestId,
      ts: Date.now(),
    });
  });

  // Solde de crédits du user courant (proxy vers Panel via HMAC).
  // Renvoie wallet + userQuota (si défini) + panelPublicUrl + appId pour
  // permettre au front d'afficher le badge et de rediriger vers le Panel.
  // En mode dev standalone (KINN_PANEL_CREDITS_ENABLED!=true) → mock illimité.
  r.get('/me/credits', async (req, res) => {
    try {
      const userId = String(req.user?.id || '');
      const data = await panelCredits.getBalance({ userId });
      const panelPublicUrl = String(
        process.env.KINN_PANEL_PUBLIC_URL
          || process.env.KINN_PANEL_INTERNAL_URL
          || ''
      ).replace(/\/+$/, '');
      const appId = String(process.env.KINN_PANEL_APP_ID || '');
      const clientId = String(process.env.KINN_PANEL_CLIENT_ID || '');
      res.apiOk({
        enabled: !!panelCredits.isEnabled(),
        mocked: !!data?.mocked,
        exists: data?.exists !== false,
        balance: data?.balance || null,
        currency: data?.currency || 'EUR',
        totalConsumed: data?.totalConsumed ?? null,
        userQuota: data?.userQuota || null,
        panelPublicUrl,
        appId,
        clientId,
        // URL prête à ouvrir pour aller voir le détail dans le Panel.
        // On joint TOUJOURS `?clientId=<ID>` même pour un client owner :
        // côté Panel, la route client-credits.js ignore le query param si
        // le user a déjà clientId dans son JWT, et l'exige sinon (admin/
        // consultant). Donc le lien fonctionne pour tous les profils.
        detailsUrl: (panelPublicUrl && appId)
          ? `${panelPublicUrl}/client/credits/${appId}${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''}`
          : '',
      });
    } catch (e) {
      // Erreur réseau Panel sans fail-open → on remonte un état dégradé
      // plutôt qu'une 500 qui casserait l'UI. Le badge masquera le solde.
      // Log explicite : c'est INVISIBLE sans ça (le helper avale les détails
      // hors fail-open et le frontend voit juste « Impossible de récupérer »).
      const errMsg = String(e?.message || e);
      const errStatus = (e && e.status) ? ` [HTTP ${e.status}]` : '';
      const errBody = (e && e.body) ? ` body=${JSON.stringify(e.body).slice(0, 300)}` : '';
      console.warn(`[me/credits] panel-credits call failed for user=${req.user?.id}: ${errMsg}${errStatus}${errBody}`);
      const panelPublicUrlErr = String(process.env.KINN_PANEL_PUBLIC_URL || process.env.KINN_PANEL_INTERNAL_URL || '').replace(/\/+$/, '');
      const appIdErr = String(process.env.KINN_PANEL_APP_ID || '');
      const clientIdErr = String(process.env.KINN_PANEL_CLIENT_ID || '');
      res.apiOk({
        enabled: !!panelCredits.isEnabled(),
        mocked: false,
        exists: false,
        balance: null,
        currency: 'EUR',
        totalConsumed: null,
        userQuota: null,
        panelPublicUrl: panelPublicUrlErr,
        appId: appIdErr,
        clientId: clientIdErr,
        detailsUrl: (panelPublicUrlErr && appIdErr)
          ? `${panelPublicUrlErr}/client/credits/${appIdErr}${clientIdErr ? `?clientId=${encodeURIComponent(clientIdErr)}` : ''}`
          : '',
        error: errMsg,
        errorStatus: (e && e.status) || null,
      });
    }
  });

  // Debug crédits : ping Panel + dump config + un appel getBalance live.
  // Sert uniquement à diagnostiquer (DNS, HMAC, ingress qui intercepte, etc).
  // Pas d'info sensible — secret masqué par getConfig().
  r.get('/me/credits/debug', async (req, res) => {
    const out = { config: null, ping: null, balance: null };
    try { out.config = panelCredits.getConfig(); } catch (e) { out.config = { error: e?.message }; }
    try { out.ping = await panelCredits.pingPanel(); }
    catch (e) { out.ping = { ok: false, error: e?.message, status: e?.status, body: e?.body }; }
    try { out.balance = await panelCredits.getBalance({ userId: req.user?.id }); }
    catch (e) { out.balance = { ok: false, error: e?.message, status: e?.status, body: e?.body }; }
    res.apiOk(out);
  });

  // Révoque un PAT
  r.delete('/me/pats/:id', async (req, res) => {
    const pat = await Pat.findById(req.params.id);
    if (!pat) return res.apiError(404, 'pat_not_found', 'PAT not found');
    if (String(pat.userId) !== String(req.user.id)) return res.apiError(403, 'forbidden', 'Not your PAT');
    await Pat.deleteOne({ _id: pat._id });
    res.apiOk({ id: String(pat._id) });
  });

  return r;
}

module.exports = buildRouter;
module.exports.PAT_PREFIX = PAT_PREFIX;
module.exports.hashToken = hashToken;
