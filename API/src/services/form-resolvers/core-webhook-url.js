// Resolver : URLs du déclencheur HTTP entrant.
// Variants : production, test (l'URL test ajoute ?test=1 pour bypass deploy futur).

const {
  ensureHttpTriggerEntry,
  rotateTriggerId,
  publicBaseUrl,
  assertAdminMember,
} = require('./_helpers');

function buildVariants(triggerId) {
  const base = publicBaseUrl();
  if (!triggerId) {
    return [
      { id: 'production', label: 'Production', value: '' },
      { id: 'test',       label: 'Test',       value: '' },
    ];
  }
  return [
    { id: 'production', label: 'Production', value: `${base}/api/trigger/${triggerId}` },
    { id: 'test',       label: 'Test',       value: `${base}/api/trigger/${triggerId}?test=1` },
  ];
}

async function resolve({ flow, nodeId, variant }) {
  const entry = await ensureHttpTriggerEntry(flow, nodeId);
  const variants = buildVariants(entry.triggerId);
  const cur = variants.find(v => v.id === (variant || 'production')) || variants[0];
  return {
    variants,
    current: cur.value,
    lastResolvedAt: new Date(),
  };
}

async function runAction({ flow, nodeId, memberInfo }, action) {
  if (action === 'rotate_url') {
    assertAdminMember(memberInfo);
    await rotateTriggerId(flow, nodeId);
    return resolve({ flow, nodeId });
  }
  throw new Error(`Action inconnue: ${action}`);
}

module.exports = { resolve, runAction };
