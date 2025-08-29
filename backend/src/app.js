const express = require('express');
const cors = require('cors');
let morgan = null; try { morgan = require('morgan'); } catch { morgan = null; }
const { errorHandler } = require('./middlewares/error-handler');
const { seedAllMemory, seedMongoIfEmpty } = require('./seed');

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
    app.use('/api', require('./modules/core')(store));
    app.use('/api', require('./modules/flows')(store));
    app.use('/api', require('./modules/runs')(store));
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
    app.use('/auth', require('./modules/db/auth')());
    app.use('/api', require('./modules/db/core')());
    app.use('/api', require('./modules/db/flows')());
    app.use('/api', require('./modules/db/providers')());
    app.use('/api', require('./modules/db/node-templates')());
    app.use('/api', require('./modules/db/apps')());
    app.use('/api', require('./modules/db/credentials')());
    app.use('/api', require('./modules/db/transfer')());
    app.use('/api', require('./modules/db/import-manifest')());
    app.use('/api', require('./modules/db/workspaces')());
    app.use('/api', require('./modules/db/runs')());
    app.use('/api', require('./modules/db/admin')());
    app.use('/api', require('./modules/db/plugins')());
    app.use('/api', require('./modules/db/plugin-repos')());
    app.use('/api', require('./modules/db/notifications')());
    app.use('/api', require('./modules/db/users')());
    // AI Form (SSE) module
    app.use('/api', require('./modules/db/ai-form')());
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
