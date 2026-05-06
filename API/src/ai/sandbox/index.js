// Point d'entrée unique de la sandbox d'exécution de code.
// Sélectionne le backend via AI_SANDBOX_BACKEND (bwrap|subprocess|none|auto).
// En mode auto : utilise bwrap si dispo ET userns OK, sinon subprocess.

const { which, canUseUserNamespaces } = require('./utils');
const bwrapBackend = require('./backends/bwrap-sandbox');
const subprocessBackend = require('./backends/subprocess-sandbox');
const noBackend = require('./backends/no-sandbox');

let selectedBackend = null;
let initPromise = null;

async function detectAuto() {
  const hasBwrap = !!which('bwrap');
  if (!hasBwrap) {
    return subprocessBackend;
  }
  const userns = await canUseUserNamespaces();
  if (!userns) {
    return subprocessBackend;
  }
  return bwrapBackend;
}

/**
 * Initialise la sandbox. Idempotent.
 * Variables d'environnement :
 *   - AI_SANDBOX_BACKEND = bwrap | subprocess | none | auto (défaut auto)
 */
async function init() {
  if (selectedBackend) return selectedBackend;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const envChoice = String(process.env.AI_SANDBOX_BACKEND || 'auto').toLowerCase();
    let backend;
    switch (envChoice) {
      case 'bwrap':
        backend = bwrapBackend;
        break;
      case 'subprocess':
        backend = subprocessBackend;
        break;
      case 'none':
        backend = noBackend;
        break;
      case 'auto':
      case '':
      default:
        backend = await detectAuto();
        break;
    }
    selectedBackend = backend;
    // eslint-disable-next-line no-console
    console.log(`[sandbox] backend selected: ${backend.name} (env=${envChoice})`);
    return backend;
  })();

  return initPromise;
}

/**
 * Exécute le code dans la sandbox. Lazy init au premier appel.
 * @param {object} opts — voir backends/bwrap-sandbox.js
 */
async function run(opts) {
  const backend = selectedBackend || await init();
  return backend.run(opts);
}

function getBackend() {
  return selectedBackend ? selectedBackend.name : null;
}

module.exports = { init, run, getBackend };
