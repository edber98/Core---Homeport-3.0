// Logger préfixé par jobId pour le harness.
//
// Avant : tous les logs étaient `[harness] ...` → impossible de distinguer un agent
// principal de ses 3 sous-agents en parallèle.
//
// Maintenant : `[harness:1234abcd:main] ...` ou `[harness:5678efgh:research:d=1] ...`
//   - 1234abcd = 8 derniers caractères du jobId (lisible mais identifiable)
//   - main / research / file_analyzer = type (main ou subagentType)
//   - d=N = depth (uniquement si > 0)

/**
 * @param {object} [jobContext] - { jobId, parentJobId, subagentType, depth }
 * @returns {{ log, warn, error, prefix }}
 */
function createHarnessLogger(jobContext) {
  const rawJobId = jobContext?.jobId ? String(jobContext.jobId) : '';
  const shortId = rawJobId ? rawJobId.slice(-8) : 'main';
  const isSubagent = !!jobContext?.parentJobId;
  const type = jobContext?.subagentType || (isSubagent ? 'sub' : 'main');
  const depth = Number(jobContext?.depth || 0);
  const depthSuffix = depth > 0 ? `:d=${depth}` : '';
  const prefix = `[harness:${shortId}:${type}${depthSuffix}]`;

  return {
    prefix,
    log: (...args) => console.log(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
  };
}

module.exports = { createHarnessLogger };
