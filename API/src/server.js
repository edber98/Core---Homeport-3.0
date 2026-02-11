// Load .env early (idempotent)
try { require('./config/load-env').loadEnvOnce(); } catch {}
const http = require('http');
const { buildApp } = require('./app');
const { PORT } = require('./config/env');

const useMemory = process.env.CI_NO_DB === '1';
const { app } = buildApp({ useMemory });
const server = http.createServer(app);
// Attach WebSocket if available
try { require('./realtime/ws').attach(server); } catch {}
// Attach Socket.IO if available
try { require('./realtime/socketio').attach(server); } catch {}

(async () => {
  if (!useMemory) {
    try {
      const { connectMongo } = require('./db/mongo');
      const { seedMongoIfEmpty } = require('./seed');
      await connectMongo();
      // Seed first to avoid duplicate key collisions during import
      await seedMongoIfEmpty();
      // Then clone/update repos from env and reload registry
      try { const { ensureReposFromEnv } = require('./plugins/bootstrap'); await ensureReposFromEnv(); } catch (e) { try { console.error('[backend] plugin bootstrap failed:', e.message); } catch {} }
      // Ensure Tool metadata exists for frontend rendering
      try { const { seedToolsIfMissing } = require('./bootstrap/seed-tools'); await seedToolsIfMissing(); } catch (e) { try { console.error('[backend] seed tools failed:', e.message); } catch {} }
      // Start file cleanup cron
      try { const { startCleanupCron } = require('./services/file-cleanup'); startCleanupCron(); } catch (e) { try { console.error('[backend] file cleanup cron failed:', e.message); } catch {} }
    } catch (e) {
      console.error('[backend] DB init failed:', e.message);
    }
  }
  server.listen(PORT, () => {
    console.log(`[backend] listening on http://localhost:${PORT}`);
  });
})();
