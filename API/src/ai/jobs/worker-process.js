/**
 * Worker IA dédié — sans serveur HTTP.
 *
 * Lancé par le Deployment `homeport-ai-worker` (K8s). Consomme les jobs
 * bee-queue (reprise de conversations agent) et tourne le cleanup du cache.
 *
 * Responsabilités :
 *   - connexion MongoDB (états threads / queues résidents)
 *   - init des skills (catalogue IA)
 *   - init sandbox (bubblewrap, vérifie userns non-privilégié)
 *   - démarrage du resume-worker (conso bee-queue)
 *   - démarrage du cleanup-worker (rotation cache agent-cache)
 *   - heartbeat fichier /tmp/.ai-worker-alive (liveness exec K8s)
 *   - arrêt propre sur SIGTERM/SIGINT
 *
 * NB : on n'ouvre pas de port HTTP. Le liveness probe K8s fait un `find -mmin -2`
 * sur le fichier heartbeat.
 */

'use strict';

// Charge les .env une seule fois (équivalent API main)
try {
  const loader = require('../../config/load-env');
  if (loader && typeof loader.loadEnvOnce === 'function') loader.loadEnvOnce();
} catch (_) {
  // load-env optionnel selon le layout du projet
}

const fs = require('fs');
const path = require('path');

const HEARTBEAT_FILE = '/tmp/.ai-worker-alive';
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30s — la liveness K8s tolère 2min

function log(level, msg, extra) {
  const line = {
    ts: new Date().toISOString(),
    level,
    role: 'ai-worker',
    msg,
    ...(extra || {}),
  };
  // Format JSON pour Loki/Kibana
  process.stdout.write(JSON.stringify(line) + '\n');
}

async function main() {
  const { connectMongo } = require('../../db/mongo');
  const { startResumeWorker } = require('./resume-worker');
  const { startCleanupWorker } = require('../cache/cleanup-worker');
  const { initSkills } = require('../skills/init');
  const sandbox = require('../sandbox');

  log('info', 'starting');

  await connectMongo();
  log('info', 'mongo connected');

  try {
    await initSkills();
    log('info', 'skills initialized');
  } catch (e) {
    log('error', 'skills init failed', { err: e && e.message });
  }

  try {
    await sandbox.init();
    log('info', 'sandbox initialized');
  } catch (e) {
    log('error', 'sandbox init failed', { err: e && e.message });
    // On laisse crasher : sans sandbox, le worker est inutile
    throw e;
  }

  startResumeWorker();
  log('info', 'resume-worker started');

  startCleanupWorker();
  log('info', 'cleanup-worker started');

  // Heartbeat pour le liveness probe K8s
  const heartbeat = () => {
    try {
      fs.writeFileSync(HEARTBEAT_FILE, String(Date.now()));
    } catch (e) {
      log('warn', 'heartbeat write failed', { err: e && e.message });
    }
  };
  heartbeat();
  const hbTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  if (typeof hbTimer.unref === 'function') hbTimer.unref();

  log('info', 'ready');

  // Arrêt propre
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log('info', 'shutdown', { signal });
    clearInterval(hbTimer);
    try {
      fs.unlinkSync(HEARTBEAT_FILE);
    } catch (_) {}
    // Petit délai pour laisser les jobs en cours drainer
    setTimeout(() => process.exit(0), 2000).unref?.();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    log('error', 'uncaughtException', { err: err && err.stack });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    log('error', 'unhandledRejection', { reason: String(reason) });
  });
}

main().catch((err) => {
  log('fatal', 'worker failed to start', { err: err && (err.stack || err.message) });
  process.exit(1);
});
