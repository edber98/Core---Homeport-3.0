// Tests unitaires pour drainMailbox + helpers mailbox.
//
// Pas de vraie DB Mongo (le projet n'a pas mongodb-memory-server). On stub
// les modèles avec des objets in-memory pour valider la logique de drain.

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

// ─────────────────────────────────────────────────────────────────────────
// Stubs in-memory pour AiJob et AiThread
// ─────────────────────────────────────────────────────────────────────────
const _jobs = new Map();
const _threads = new Map();

function _resetStubs() {
  _jobs.clear();
  _threads.clear();
}

// Patche les requires pour que drainMailbox utilise nos stubs au lieu de Mongoose.
const Module = require('module');
const _origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, parent, ...rest) {
  if (req.endsWith('ai-job.model')) return '__stub_AiJob__';
  if (req.endsWith('ai-thread.model')) return '__stub_AiThread__';
  return _origResolve.call(this, req, parent, ...rest);
};
require.cache['__stub_AiJob__'] = {
  exports: {
    findOne: (filter, projection) => ({
      lean: async () => {
        const job = _jobs.get(filter?.id);
        if (!job) return null;
        if (projection === 'pendingMessages') {
          return { pendingMessages: job.pendingMessages || [] };
        }
        return job;
      },
    }),
    // Stub `find` pour le listing des sub-agents actifs dans drainMailbox.
    find: (filter /*, projection */) => ({
      limit: () => ({
        lean: async () => {
          const out = [];
          for (const job of _jobs.values()) {
            if (filter?.threadId && job.threadId !== filter.threadId) continue;
            if (filter?.type && job.type !== filter.type) continue;
            if (filter?.status?.$in && !filter.status.$in.includes(job.status)) continue;
            if (filter?.subagentType?.$nin && filter.subagentType.$nin.includes(job.subagentType)) continue;
            out.push(job);
          }
          return out;
        },
      }),
    }),
    updateOne: async (filter, update, opts) => {
      const job = _jobs.get(filter?.id);
      if (!job) return { matchedCount: 0 };
      // $set 'pendingMessages.$[elem].delivered': true → mark all not-yet-delivered
      if (update?.$set?.['pendingMessages.$[elem].delivered'] === true) {
        for (const m of (job.pendingMessages || [])) {
          if (m.delivered !== true) m.delivered = true;
        }
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 1 };
    },
  },
};
require.cache['__stub_AiThread__'] = {
  exports: {
    findById: (id, projection) => ({
      lean: async () => {
        const t = _threads.get(String(id));
        if (!t) return null;
        if (projection === 'pendingMessages') {
          return { pendingMessages: t.pendingMessages || [] };
        }
        return t;
      },
    }),
    updateOne: async (filter, update) => {
      const t = _threads.get(String(filter?._id));
      if (!t) return { matchedCount: 0 };
      if (update?.$set?.['pendingMessages.$[elem].delivered'] === true) {
        for (const m of (t.pendingMessages || [])) {
          if (m.delivered !== true) m.delivered = true;
        }
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 1 };
    },
  },
};

const { drainMailbox } = require('../src/ai/harness/mailbox');

// Logger de test qui collecte les messages
function makeLogger() {
  const calls = [];
  return {
    log: (...args) => calls.push(['log', args.join(' ')]),
    warn: (...args) => calls.push(['warn', args.join(' ')]),
    error: (...args) => calls.push(['error', args.join(' ')]),
    calls,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────

beforeEach(() => { _resetStubs(); });

test('drainMailbox: retourne null si aucun jobId ni threadId', async () => {
  const result = await drainMailbox({}, makeLogger());
  assert.strictEqual(result, null);
});

test('drainMailbox: retourne null si pas de messages pending', async () => {
  _jobs.set('aij_1', { id: 'aij_1', pendingMessages: [] });
  const result = await drainMailbox({ jobId: 'aij_1' }, makeLogger());
  assert.strictEqual(result, null);
});

test('drainMailbox: lit les pendingMessages du job', async () => {
  _jobs.set('aij_1', {
    id: 'aij_1',
    pendingMessages: [
      { from: 'user', message: 'ajoute Mantis aussi', createdAt: new Date(), delivered: false },
    ],
  });
  const log = makeLogger();
  const result = await drainMailbox({ jobId: 'aij_1' }, log);
  assert.ok(result);
  assert.strictEqual(result.count, 1);
  assert.match(result.message.content, /ajoute Mantis aussi/);
  assert.strictEqual(result.message.role, 'user');
  // Vérifie qu'on log bien
  assert.ok(log.calls.some(c => c[1].includes('mailbox drain')));
});

test('drainMailbox: marque comme delivered après lecture (idempotent)', async () => {
  _jobs.set('aij_2', {
    id: 'aij_2',
    pendingMessages: [
      { from: 'user', message: 'message 1', delivered: false },
    ],
  });
  // 1er drain → délivré
  const r1 = await drainMailbox({ jobId: 'aij_2' }, makeLogger());
  assert.ok(r1);
  assert.strictEqual(r1.count, 1);
  // Attendre que l'update async ait été appliqué
  await new Promise(r => setTimeout(r, 20));
  // 2e drain → rien à délivrer (idempotent)
  const r2 = await drainMailbox({ jobId: 'aij_2' }, makeLogger());
  assert.strictEqual(r2, null);
});

test('drainMailbox: lit les pendingMessages du thread (pas de job)', async () => {
  _threads.set('thread_X', {
    _id: 'thread_X',
    pendingMessages: [
      { from: 'user', fromName: 'Edouard', message: 'arrête de chercher', delivered: false },
    ],
  });
  const result = await drainMailbox({ threadId: 'thread_X' }, makeLogger());
  assert.ok(result);
  assert.strictEqual(result.count, 1);
  assert.match(result.message.content, /arrête de chercher/);
  assert.match(result.message.content, /from="Edouard"/);
});

test('drainMailbox: fusionne job + thread mailbox quand les 2 ont des messages', async () => {
  _jobs.set('aij_X', {
    id: 'aij_X',
    pendingMessages: [{ from: 'parent', message: 'job message', delivered: false }],
  });
  _threads.set('thread_Y', {
    _id: 'thread_Y',
    pendingMessages: [{ from: 'user', message: 'thread message', delivered: false }],
  });
  const log = makeLogger();
  const result = await drainMailbox({ jobId: 'aij_X', threadId: 'thread_Y' }, log);
  assert.ok(result);
  assert.strictEqual(result.count, 2);
  assert.match(result.message.content, /job message/);
  assert.match(result.message.content, /thread message/);
  // Log doit indiquer les 2 sources
  assert.ok(log.calls.some(c => c[1].includes('job=1') && c[1].includes('thread=1')));
});

test('drainMailbox: ignore les messages déjà delivered', async () => {
  _jobs.set('aij_3', {
    id: 'aij_3',
    pendingMessages: [
      { from: 'user', message: 'ancien (déjà délivré)', delivered: true },
      { from: 'user', message: 'nouveau', delivered: false },
    ],
  });
  const result = await drainMailbox({ jobId: 'aij_3' }, makeLogger());
  assert.strictEqual(result.count, 1);
  assert.match(result.message.content, /nouveau/);
  assert.doesNotMatch(result.message.content, /ancien/);
});

test('drainMailbox: format XML des incoming-message blocks', async () => {
  _jobs.set('aij_4', {
    id: 'aij_4',
    pendingMessages: [
      { from: 'user', fromName: 'Bob', message: 'salut', createdAt: new Date('2026-01-15T10:30:00Z'), delivered: false },
    ],
  });
  const result = await drainMailbox({ jobId: 'aij_4' }, makeLogger());
  assert.match(result.message.content, /<incoming-message from="Bob"/);
  assert.match(result.message.content, /at="2026-01-15T10:30:00\.000Z"/);
  assert.match(result.message.content, /<\/incoming-message>/);
});

test('drainMailbox: message system prompt pousse à intégrer les notes user', async () => {
  _threads.set('thread_Z', {
    _id: 'thread_Z',
    pendingMessages: [{ from: 'user', message: 'change d\'approche', delivered: false }],
  });
  const result = await drainMailbox({ threadId: 'thread_Z' }, makeLogger());
  assert.match(result.message.content, /MESSAGES REÇUS PENDANT TON EXÉCUTION/);
  assert.match(result.message.content, /tiens-en compte/i);
  assert.match(result.message.content, /Continue ta tâche/);
});

test('drainMailbox: subagent peut forwarder au parent', async () => {
  _jobs.set('aij_sub', {
    id: 'aij_sub',
    pendingMessages: [{ from: 'user', message: 'attention aux EU', delivered: false }],
  });
  // Pour qu'on injecte le hint "forwarder au parent", il faut que le jobContext
  // signale qu'on est un sub-agent via parentJobId présent.
  const result = await drainMailbox({ jobId: 'aij_sub', parentJobId: 'aij_parent' }, makeLogger());
  assert.match(result.message.content, /sous-agent.*forwarder.*send_message_to_agent/i);
});

test('drainMailbox: main agent reçoit la liste des sub-agents actifs', async () => {
  _threads.set('thread_main', {
    _id: 'thread_main',
    pendingMessages: [{ from: 'user', message: 'max 2 sources', delivered: false }],
  });
  // 2 sub-agents actifs sur le même thread → le main doit voir leurs jobIds
  _jobs.set('aij_r1', { id: 'aij_r1', threadId: 'thread_main', type: 'subagent', subagentType: 'research', status: 'running', startedAt: new Date() });
  _jobs.set('aij_r2', { id: 'aij_r2', threadId: 'thread_main', type: 'subagent', subagentType: 'file_analyzer', status: 'running', startedAt: new Date() });
  const result = await drainMailbox({ threadId: 'thread_main' }, makeLogger());
  assert.ok(result);
  // Le message doit contenir la section SUB-AGENTS ACTUELLEMENT EN COURS
  assert.match(result.message.content, /SUB-AGENTS ACTUELLEMENT EN COURS/);
  assert.match(result.message.content, /aij_r1/);
  assert.match(result.message.content, /aij_r2/);
  // Et l'instruction send_message_to_agent au lieu de spawn
  assert.match(result.message.content, /send_message_to_agent/);
  assert.match(result.message.content, /NE SPAWN PAS un nouveau/);
});

test('drainMailbox: gère gracieusement les erreurs DB', async () => {
  // Job inexistant → pas de crash
  const result = await drainMailbox({ jobId: 'inexistant' }, makeLogger());
  assert.strictEqual(result, null);
});
