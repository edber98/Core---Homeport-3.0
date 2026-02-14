// Background runner — launches agents that run independently
// Results are saved as messages in the thread + Socket.IO notification

const AiAgentRun = require('../db/models/ai-agent-run.model');
const AiMessage = require('../db/models/ai-message.model');
const AiThread = require('../db/models/ai-thread.model');
const { runHarness } = require('./agent-harness');
const { buildContext } = require('./context/context-builder');

/**
 * Spawn a background agent run.
 * Non-blocking — returns immediately with the run ID.
 *
 * @param {object} opts
 * @param {string} opts.threadId - Thread ObjectId
 * @param {string} opts.workspaceId - Workspace ObjectId
 * @param {string} opts.companyId - Company ObjectId
 * @param {string} opts.userId - User ObjectId
 * @param {string} [opts.mode] - Override mode
 * @param {string} [opts.agentId] - Agent to use
 * @param {Array} opts.messages - Conversation messages
 * @param {object} [opts.metadata] - Mode metadata
 * @param {object} [opts.agentOverrides] - Agent overrides
 * @param {function} [opts.notifySocket] - Socket.IO emit function
 * @returns {{ runId: string }}
 */
async function spawnBackgroundAgent(opts) {
  const { threadId, workspaceId, companyId, userId, mode, agentId, messages, metadata, agentOverrides, notifySocket } = opts;

  // Create run record
  const run = await AiAgentRun.create({
    threadId,
    workspaceId,
    userId,
    status: 'running',
    mode: mode || 'chat',
    agentId: agentId || undefined,
  });

  console.log(`[background] spawning run ${run.id} for thread ${threadId}`);

  // Execute in the next tick (non-blocking)
  setImmediate(async () => {
    try {
      // Build context
      const context = await buildContext({ companyId, workspaceId, userId });
      context._metadata = metadata || {};

      // Run the agent
      let fullText = '';
      const toolCalls = [];
      let usageData = null;

      const generator = runHarness({
        mode: mode || 'chat',
        messages,
        context,
        metadata,
        agentOverrides,
      });

      for await (const event of generator) {
        switch (event.type) {
          case 'message':
            fullText += event.text || '';
            break;
          case 'tool.end':
            toolCalls.push({
              id: event.id,
              name: event.name,
              args: event.args,
              result: event.result,
              status: event.status,
              duration: event.duration,
            });
            break;
          case 'done':
            usageData = event.usage;
            break;
        }
      }

      // Save result as assistant message
      if (fullText || toolCalls.length) {
        await AiMessage.create({
          threadId,
          role: 'assistant',
          content: fullText,
          toolCalls: toolCalls.length ? toolCalls : undefined,
          usage: usageData && (usageData.input || usageData.output) ? usageData : undefined,
        });
      }

      // Update run status
      await AiAgentRun.updateOne({ _id: run._id }, {
        $set: { status: 'completed', finishedAt: new Date(), usage: usageData || { input: 0, output: 0 } },
      });

      // Update thread timestamp
      await AiThread.updateOne({ _id: threadId }, { $set: { updatedAt: new Date() } });

      console.log(`[background] run ${run.id} completed`);

      // Notify via Socket.IO
      if (notifySocket) {
        notifySocket('ai:background:done', { runId: run.id, threadId: String(threadId), status: 'completed' });
      }
    } catch (e) {
      console.error(`[background] run ${run.id} error:`, e?.message || e);
      await AiAgentRun.updateOne({ _id: run._id }, {
        $set: { status: 'error', finishedAt: new Date(), error: e?.message || 'Unknown error' },
      }).catch(() => {});

      if (notifySocket) {
        notifySocket('ai:background:done', { runId: run.id, threadId: String(threadId), status: 'error', error: e?.message });
      }
    }
  });

  return { runId: run.id, status: 'running' };
}

module.exports = { spawnBackgroundAgent };
