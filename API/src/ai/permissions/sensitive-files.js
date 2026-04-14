// Sensitive filesystem paths — always blocked or require explicit confirmation.
// Used by project-fs tools to refuse reading/writing into secrets folders.

const PATTERNS = [
  /(^|\/)\.env(\.|$)/,
  /(^|\/)\.git\//,
  /(^|\/)node_modules\//,
  /\.(pem|key|p12|pfx|crt|keystore)$/i,
  /(^|\/)id_rsa/,
  /\.aws\/credentials/,
  /\.ssh\//,
  /\.netrc$/,
  /secrets\.(json|ya?ml)$/i,
  /\.(docker|kube)\/config/,
  /credentials\.json$/i,
];

function isSensitivePath(p) {
  if (!p || typeof p !== 'string') return false;
  return PATTERNS.some(re => re.test(p));
}

module.exports = { isSensitivePath, PATTERNS };
