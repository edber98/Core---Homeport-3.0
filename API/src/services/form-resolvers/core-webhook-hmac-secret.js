// Resolver : secret HMAC du déclencheur HTTP (mode auth = hmac).
// L'extérieur signe : sig = HMAC-<algo>(secret, body) → header X-Kinn-Signature.
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
  const value = secrets.hmacSecret || '';
  return {
    variants: [{ id: 'hmacSecret', label: 'Secret HMAC', value }],
    current: value,
    lastResolvedAt: new Date(),
  };
}

async function runAction({ flow, nodeId, memberInfo }, action) {
  if (action === 'rotate_secret') {
    assertAdminMember(memberInfo);
    await rotateSecretField(flow, nodeId, 'hmacSecret');
    return resolve({ flow, nodeId });
  }
  throw new Error(`Action inconnue: ${action}`);
}

module.exports = { resolve, runAction };
