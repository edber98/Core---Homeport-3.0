const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Notification = require('../../db/models/notification.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/notifications', async (req, res) => {
    const { workspaceId, entityType, entityId, acknowledged } = req.query;
    const q = { companyId: req.user.companyId };
    if (workspaceId) q.workspaceId = workspaceId;
    if (entityType) q.entityType = entityType;
    if (entityId) q.entityId = entityId;
    if (acknowledged != null) q.acknowledged = acknowledged === 'true';
    const list = await Notification.find(q).sort({ createdAt: -1 }).lean();
    res.apiOk(list);
  });

  r.post('/notifications/:id/ack', async (req, res) => {
    const n = await Notification.findById(req.params.id);
    if (!n || String(n.companyId) !== req.user.companyId) return res.apiError(404, 'notification_not_found', 'Notification not found');
    n.acknowledged = true; await n.save();
    res.apiOk(n);
  });

  return r;
}

