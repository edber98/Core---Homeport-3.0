// Resolver : mot de passe HTTP Basic du déclencheur HTTP (mode auth = basic).
// Single variant. Action: rotate_secret régénère.

const {
  ensureHttpTriggerEntry,
  decryptSecrets,
  rotateSecretField,
  assertAdminMember,
} = require('./_helpers');

async function resolve({ flow, nodeId }) {
  const entry = await ensureHttpTriggerEntry(flow, nodeId);
  const secrets = decryptSecrets(entry);
  const value = secrets.password || '';
  return {
    variants: [{ id: 'password', label: 'Mot de passe', value }],
    current: value,
    lastResolvedAt: new Date(),
  };
}

async function runAction({ flow, nodeId, memberInfo }, action) {
  if (action === 'rotate_secret') {
    assertAdminMember(memberInfo);
    await rotateSecretField(flow, nodeId, 'password');
    return resolve({ flow, nodeId });
  }
  throw new Error(`Action inconnue: ${action}`);
}

module.exports = { resolve, runAction };
