const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../auth/jwt');

module.exports = function(store){
  const r = express.Router();
  r.use(authMiddleware(store));
  r.use(requireCompanyScope());

  function ensureFlowAccess(req, res, next){
    const flow = store.flows.get(String(req.params.flowId));
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = store.workspaces.get(String(flow.workspaceId));
    if (!ws || ws.companyId !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    req.flow = flow; req.workspace = ws; next();
  }
  function ensureThreadAccess(req, res, next){
    const tid = String(req.params.threadId);
    const t = (store.aiThreads || new Map()).get(tid);
    if (!t) return res.apiError(404, 'thread_not_found', 'Chat thread not found');
    const flow = store.flows.get(String(t.flowId));
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = store.workspaces.get(String(flow.workspaceId));
    if (!ws || ws.companyId !== req.user.companyId) return res.apiError(404, 'not_found', 'Not found');
    req.thread = t; req.flow = flow; req.workspace = ws; next();
  }
  function ensureMaps(){
    if (!store.aiThreads) store.aiThreads = new Map(); // id-> { id, flowId, title, createdAt, updatedAt }
    if (!store.aiMsgs) store.aiMsgs = new Map();       // threadId -> [ { id, threadId, role, text, parts, createdAt } ]
    if (!store.aiCtx) store.aiCtx = new Map();         // flowId -> { id, flowId, data, updatedAt }
  }
  function newId(prefix){ try { return prefix + '-' + Math.random().toString(36).slice(2, 9); } catch { return prefix + '-' + Date.now().toString(36); } }

  // Threads
  r.get('/flows/:flowId/ai/chats', ensureFlowAccess, (req, res) => {
    ensureMaps(); const fid = String(req.flow.id);
    const list = [...store.aiThreads.values()].filter(t => String(t.flowId) === fid).sort((a,b)=> (b.updatedAt||0)-(a.updatedAt||0));
    res.apiOk(list);
  });
  r.post('/flows/:flowId/ai/chats', ensureFlowAccess, (req, res) => {
    ensureMaps(); const fid = String(req.flow.id);
    const title = String((req.body && req.body.title) || 'Chat');
    const now = Date.now();
    const t = { id: newId('ait'), flowId: fid, title, createdAt: now, updatedAt: now };
    store.aiThreads.set(t.id, t); store.aiMsgs.set(t.id, []);
    res.status(201).json({ success: true, data: t, requestId: req.requestId, ts: Date.now() });
  });
  r.delete('/ai/chats/:threadId', ensureThreadAccess, (req, res) => {
    ensureMaps(); const tid = String(req.thread.id);
    store.aiThreads.delete(tid); store.aiMsgs.delete(tid);
    res.apiOk(true);
  });

  // Messages
  r.get('/ai/chats/:threadId/messages', ensureThreadAccess, (req, res) => {
    ensureMaps(); const tid = String(req.thread.id);
    const list = (store.aiMsgs.get(tid) || []).slice().sort((a,b)=> (a.createdAt||0)-(b.createdAt||0));
    res.apiOk(list);
  });
  r.post('/ai/chats/:threadId/messages', ensureThreadAccess, (req, res) => {
    ensureMaps(); const tid = String(req.thread.id);
    const { role, text, parts } = req.body || {};
    const now = Date.now();
    const m = { id: newId('aim'), threadId: tid, role: String(role||'user'), text: text || '', parts: Array.isArray(parts) ? parts : undefined, createdAt: now };
    const arr = store.aiMsgs.get(tid) || []; arr.push(m); store.aiMsgs.set(tid, arr);
    const t = store.aiThreads.get(tid); if (t) { t.updatedAt = now; store.aiThreads.set(tid, t); }
    res.status(201).json({ success: true, data: m, requestId: req.requestId, ts: Date.now() });
  });
  r.delete('/ai/chats/:threadId/messages', ensureThreadAccess, (req, res) => {
    ensureMaps(); const tid = String(req.thread.id);
    store.aiMsgs.set(tid, []);
    res.apiOk(true);
  });

  // Contexte (un par flow)
  r.get('/flows/:flowId/ai/context', ensureFlowAccess, (req, res) => {
    ensureMaps(); const fid = String(req.flow.id);
    const ctx = store.aiCtx.get(fid) || null;
    res.apiOk(ctx);
  });
  r.put('/flows/:flowId/ai/context', ensureFlowAccess, (req, res) => {
    ensureMaps(); const fid = String(req.flow.id);
    const data = (req.body && Object.prototype.hasOwnProperty.call(req.body, 'data')) ? req.body.data : null;
    const now = Date.now();
    const ctx = { id: 'ctx-' + fid, flowId: fid, data, updatedAt: now };
    store.aiCtx.set(fid, ctx);
    res.apiOk(ctx);
  });
  r.delete('/flows/:flowId/ai/context', ensureFlowAccess, (req, res) => {
    ensureMaps(); const fid = String(req.flow.id);
    store.aiCtx.delete(fid);
    res.apiOk(true);
  });

  return r;
};

