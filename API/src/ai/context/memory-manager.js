// Memory manager — CRUD for persistent user memory
const AiUserContext = require('../../db/models/ai-user-context.model');

async function getMemory(userId) {
  const ctx = await AiUserContext.findOne({ userId }).lean();
  return ctx?.memory || {};
}

async function setMemory(userId, key, value, companyId) {
  await AiUserContext.findOneAndUpdate(
    { userId },
    {
      $set: { [`memory.${key}`]: value },
      $setOnInsert: { companyId },
    },
    { upsert: true }
  );
}

async function deleteMemory(userId, key) {
  await AiUserContext.findOneAndUpdate(
    { userId },
    { $unset: { [`memory.${key}`]: 1 } }
  );
}

async function clearMemory(userId) {
  await AiUserContext.findOneAndUpdate(
    { userId },
    { $set: { memory: {} } }
  );
}

async function trackToolUsage(userId, toolKey, companyId) {
  const ctx = await AiUserContext.findOneAndUpdate(
    { userId },
    { $setOnInsert: { companyId, memory: {} } },
    { upsert: true, new: true }
  );

  const freq = ctx.frequentTools || [];
  // Remove if already present, then prepend
  const filtered = freq.filter(k => k !== toolKey);
  filtered.unshift(toolKey);
  // Keep top 20
  await AiUserContext.updateOne(
    { userId },
    { $set: { frequentTools: filtered.slice(0, 20) } }
  );
}

module.exports = { getMemory, setMemory, deleteMemory, clearMemory, trackToolUsage };
