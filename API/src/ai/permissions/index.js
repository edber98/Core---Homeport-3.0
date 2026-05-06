// Barrel export for the permissions module
const { TOOL_RISK, resolveToolRisk } = require('./tool-risk');
const { checkPermission, resolvePendingDecision, MATRIX } = require('./permission-gate');
const { isSensitivePath, PATTERNS } = require('./sensitive-files');

module.exports = {
  TOOL_RISK,
  resolveToolRisk,
  checkPermission,
  resolvePendingDecision,
  MATRIX,
  isSensitivePath,
  SENSITIVE_PATTERNS: PATTERNS,
};
