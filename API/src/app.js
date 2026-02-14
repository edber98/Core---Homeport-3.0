const express = require('express');
const cors = require('cors');
let morgan = null; try { morgan = require('morgan'); } catch { morgan = null; }
const { errorHandler } = require('./middlewares/error-handler');
const { seedAllMemory, seedMongoIfEmpty } = require('./seed');
const { authMiddleware, requireCompanyScope } = require('./auth/jwt');

function buildApp(opts = {}){
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  if (morgan) app.use(morgan('dev'));
  app.use(require('./middlewares/api-response').apiResponse());

  const useMemory = !!opts.useMemory || process.env.CI_NO_DB === '1';
  let ctx = { useMemory };

  app.use(async (req, _res, next) => {
    req.ctx = ctx;
    next();
  });

  // Routes (memory or db)
  if (useMemory){
    const { MemoryStore } = require('./store/memory');
    const store = new MemoryStore();
    seedAllMemory(store);
    app.use((req, _res, next) => { req.store = store; next(); });
    app.use('/auth', require('./modules/auth')(store));
    // Public auth alias under /api to match frontend prod base (no auth middleware here)
    app.use('/api/auth', require('./modules/auth')(store));
    app.use('/api', require('./modules/core')(store));
    app.use('/api', require('./modules/flows')(store));
    // AI Console removed — replaced by unified ai-v2 system
    app.use('/api', require('./modules/runs')(store));
    // Alias SSE stream without /api prefix for EventSource clients
    app.get('/runs/:runId/stream', authMiddleware(store), requireCompanyScope(), (req, res) => {
      const { runId } = req.params; const run = store.runs.get(runId);
      if (!run) { console.warn(`[runs][mem][alias] stream: run not found runId=${runId} reqId=${req.requestId}`); return res.apiError(404, 'run_not_found', 'Run not found'); }
      const ws = store.workspaces.get(run.workspaceId); if (!ws || ws.companyId !== req.user.companyId) return res.status(404).json({ error: 'run not found' });
      console.log(`[runs][mem][alias] stream open: runId=${runId} events=${(run.events||[]).length} reqId=${req.requestId}`);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders && res.flushHeaders();

      const sendEvent = (ev) => { res.write(`event: ${ev.type}\n`); res.write(`data: ${JSON.stringify(ev)}\n\n`); };
      for (const ev of (run.events || [])) sendEvent(ev);
      let lastCount = (run.events || []).length;
      const interval = setInterval(() => {
        const r = store.runs.get(runId);
        if (!r) { clearInterval(interval); try{ res.end(); }catch{} return; }
        if ((r.events?.length || 0) > lastCount){
          for (let i = lastCount; i < r.events.length; i++) sendEvent(r.events[i]);
          lastCount = r.events.length;
        }
        res.write(`event: heartbeat\n`);
        res.write(`data: ${JSON.stringify({ ts: Date.now(), status: r.status })}\n\n`);
        if (r.status === 'success' || r.status === 'error' || r.status === 'cancelled'){
          clearInterval(interval);
          try{ res.end(); }catch{}
        }
      }, 300);
      req.on('close', () => clearInterval(interval));
    });
    // Flow simulation (memory)
    app.use('/api', require('./modules/simulate')(store));
    // Layout (ELK) for memory mode
    app.use('/api', require('./modules/layout')(store));
    // Ad-hoc test runs (ephemeral, from request body)
    app.use('/api', require('./modules/db/test-runs')());
    app.use('/api', require('./modules/admin')(store));
  } else {
    // Ensure DB is connected and seeded once on first request (lazy boot)
    let booted = false; let bootPromise = null;
    app.use(async (_req, _res, next) => {
      if (!booted){
        if (!bootPromise){
          bootPromise = (async () => { const { connectMongo } = require('./db/mongo'); await connectMongo(); await seedMongoIfEmpty(); booted = true; })();
        }
        try { await bootPromise; } catch (e) { console.error('DB boot error', e); }
      }
      next();
    });
    // Webhook receiver (no auth — token-based security)
    app.use('/api/hooks', require('./modules/db/webhook-receiver')());
    app.use('/auth', require('./modules/db/auth')());
    // Public auth alias under /api to match frontend prod base (no auth middleware here)
    app.use('/api/auth', require('./modules/db/auth')());
    app.use('/api', require('./modules/db/core')());
    app.use('/api', require('./modules/db/flows')());
    app.use('/api', require('./modules/db/forms')());
    app.use('/api', require('./modules/db/providers')());
    app.use('/api', require('./modules/db/tools')());
    app.use('/api', require('./modules/db/node-templates')());
    app.use('/api', require('./modules/db/apps')());
    app.use('/api', require('./modules/db/credentials')());
    app.use('/api', require('./modules/db/transfer')());
    app.use('/api', require('./modules/db/import-manifest')());
    app.use('/api', require('./modules/db/workspaces')());
    app.use('/api', require('./modules/db/runs')());
    app.use('/api', require('./modules/db/triggers')());
    // Alias SSE stream without /api prefix (DB mode)
    app.get('/runs/:runId/stream', authMiddleware(), requireCompanyScope(), async (req, res) => {
      const { Types } = require('mongoose');
      const Run = require('./db/models/run.model');
      const RunEvent = require('./db/models/run-event.model');
      const Workspace = require('./db/models/workspace.model');
      const WorkspaceMembership = require('./db/models/workspace-membership.model');
      const rid = String(req.params.runId);
      let run = null;
      if (Types.ObjectId.isValid(rid)) run = await Run.findById(rid);
      if (!run) run = await Run.findOne({ id: rid });
      if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
      const ws = await Workspace.findById(run.workspaceId);
      if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'run_not_found', 'Run not found');
      const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
      if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders && res.flushHeaders();
      console.log(`[runs][db][alias] stream open: runId=${String(run._id)} events=${(run.events||[]).length} reqId=${req.requestId}`);

      const sendLive = (ev) => { res.write(`event: live\n`); res.write(`data: ${JSON.stringify(ev)}\n\n`); };
      let lastSeq = 0;
      const history = await RunEvent.find({ runId: run._id }).sort({ seq: 1 }).lean();
      for (const ev of history){ sendLive(ev); lastSeq = Math.max(lastSeq, ev.seq || 0); }
      try { const doc0 = await Run.findById(run._id).lean(); if (doc0) sendLive({ type: 'run.status', runId: String(run._id), seq: lastSeq, run: { status: doc0.status, startedAt: doc0.startedAt, finishedAt: doc0.finishedAt, durationMs: doc0.durationMs } }); } catch {}
      const interval = setInterval(async () => {
        const doc = await Run.findById(run._id).lean();
        if (!doc) { clearInterval(interval); try{ res.end(); }catch{} return; }
        const news = await RunEvent.find({ runId: run._id, seq: { $gt: lastSeq } }).sort({ seq: 1 }).lean();
        for (const ev of news){ sendLive(ev); lastSeq = Math.max(lastSeq, ev.seq || 0); }
        sendLive({ type: 'run.status', runId: String(run._id), seq: lastSeq, run: { status: doc.status, startedAt: doc.startedAt, finishedAt: doc.finishedAt, durationMs: doc.durationMs } });
        if (doc.status === 'success' || doc.status === 'error' || doc.status === 'cancelled' || doc.status === 'timed_out'){
          clearInterval(interval);
          try{ res.end(); }catch{}
        }
      }, 300);
      req.on('close', () => { clearInterval(interval); console.log(`[runs][db][alias] stream closed: runId=${String(run._id)} reqId=${req.requestId}`); });
    });
    // AI unified (new system)
    app.use('/api', require('./modules/db/ai')());
    app.use('/api', require('./modules/db/transcribe')());
    // Flow simulation (db)
    app.use('/api', require('./modules/db/simulate')());
    // Layout (ELK) for DB mode
    app.use('/api', require('./modules/db/layout')());
    // Ad-hoc test runs (ephemeral, from request body)
    app.use('/api', require('./modules/db/test-runs')());
    app.use('/api', require('./modules/db/admin')());
    app.use('/api', require('./modules/db/plugins')());
    app.use('/api', require('./modules/db/plugin-repos')());
    app.use('/api', require('./modules/db/notifications')());
    app.use('/api', require('./modules/db/dashboard')());
    app.use('/api', require('./modules/db/files')());
    app.use('/api', require('./modules/db/users')());
    // Old AI modules removed — all AI functionality is now in the unified ai.js routes
  }

  // API docs (Swagger UI)
  app.use(require('./modules/docs')());

  // Health endpoints (work in both modes)
  app.use('/api', require('./modules/health')());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use(errorHandler);
  return { app };
}

module.exports = { buildApp };
