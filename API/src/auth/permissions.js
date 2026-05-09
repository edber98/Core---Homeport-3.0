// Matrice de permissions admin/editor/viewer pour Kinn.
//
//                                            admin  editor  viewer
//   read:* (entités fonctionnelles)            ✓      ✓       ✓
//   write:flow|form|credential                 ✓      ✓       —
//   manage:workspace_members                   ✓      —       —
//   manage:user_role                           ✓      —       —
//   manage:integrations (api keys, webhooks)   ✓      —       —
//   delete:workspace                           ✓      —       —
//
// Source de vérité de la matrice ici. Les guards Express l'utilisent via
// requirePermission(req, 'write:flow') ou requireRole(['admin','editor']).

const ROLE_RANK = { admin: 3, editor: 2, viewer: 1 };

const PERMISSIONS = {
  'read:any':                   ['admin', 'editor', 'viewer'],
  'write:flow':                 ['admin', 'editor'],
  'write:form':                 ['admin', 'editor'],
  'write:credential':           ['admin', 'editor'],
  'manage:workspace_members':   ['admin'],
  'manage:user_role':           ['admin'],
  'manage:integrations':        ['admin'],
  'delete:workspace':           ['admin'],
  'manage:templates':           ['admin'],
  'manage:webhooks':            ['admin'],
};

/** Rôle effectif d'un user : localPromotion override role (synced Zitadel). */
function effectiveRole(user) {
  return (user && (user.localPromotion || user.role)) || 'viewer';
}

function hasPermission(user, perm) {
  const role = effectiveRole(user);
  const allowed = PERMISSIONS[perm];
  if (!allowed) return false;
  return allowed.includes(role);
}

function hasRoleAtLeast(user, minRole) {
  const role = effectiveRole(user);
  return (ROLE_RANK[role] || 0) >= (ROLE_RANK[minRole] || 0);
}

/** Express middleware factory : exige une permission précise. */
function requirePermission(perm) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    if (!hasPermission(req.user, perm)) {
      return res.status(403).json({ error: 'forbidden', missing: perm });
    }
    next();
  };
}

/** Express middleware factory : exige un rôle minimum (admin > editor > viewer). */
function requireRoleAtLeast(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    if (!hasRoleAtLeast(req.user, minRole)) {
      return res.status(403).json({ error: 'forbidden', requires: minRole });
    }
    next();
  };
}

module.exports = {
  PERMISSIONS,
  ROLE_RANK,
  effectiveRole,
  hasPermission,
  hasRoleAtLeast,
  requirePermission,
  requireRoleAtLeast,
};
