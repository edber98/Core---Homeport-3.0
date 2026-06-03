// OpenAI streaming client — native fetch, no LangChain
// Yields normalized events: text_delta, tool_use_start, tool_input_delta, tool_use_end, done

const { isDebug } = require('../util/debug');

async function* streamOpenAI(messages, tools, config) {
  const apiKey = config.apiKey;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const model = config.model || 'gpt-5.2';
  // baseURL configurable pour cibler un endpoint OpenAI-compatible :
  //   - vLLM auto-hébergé (http://IP:8000/v1)
  //   - LM Studio, Ollama, Groq, Together.ai, Mistral La Plateforme, etc.
  //   - Tout serveur qui parle l'API Chat Completions
  // Par défaut : OpenAI cloud officiel.
  const baseURL = (config.baseURL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  // GPT-5.2 with reasoning=none supports temperature; others don't
  const isReasoningModel = /^(gpt-5|o[1-9])/.test(model);
  const reasoningEffort = config.reasoningEffort || undefined;
  const noCustomTemp = isReasoningModel && reasoningEffort !== 'none';
  const isOpenAiOfficial = baseURL.startsWith('https://api.openai.com');
  // Pour les serveurs OpenAI-compatibles (vLLM/Qwen/Ollama/etc.), beaucoup de
  // chat templates Jinja (notamment Qwen) imposent que les messages role='system'
  // soient UNIQUEMENT en position 0. Or Kinn injecte parfois des system messages
  // au milieu (drainMailbox, resume parent, todo_write nudges, etc.).
  // → On consolide : 1er system reste tel quel, les suivants deviennent user
  //   messages préfixés '[Note système]' (le contenu est préservé).
  // OpenAI officiel et Anthropic ne sont PAS impactés (skip cette transformation).
  let finalMessages = messages;
  if (!isOpenAiOfficial && Array.isArray(messages)) {
    let firstSystemSeen = false;
    finalMessages = messages.map((m, i) => {
      if (m?.role !== 'system') return m;
      if (i === 0 || !firstSystemSeen) {
        if (i === 0) firstSystemSeen = true;
        return m;
      }
      // System message tardif → convert en user avec préfixe.
      return { ...m, role: 'user', content: `[Note système]\n${m.content || ''}` };
    });
    // Edge case : si aucun system en position 0 mais un plus loin, on déplace
    // le 1er system trouvé en tête (concat des autres en user après).
    if (finalMessages[0]?.role !== 'system') {
      const idx = finalMessages.findIndex(m => m?.role === 'system');
      if (idx > 0) {
        const sys = finalMessages[idx];
        finalMessages = [sys, ...finalMessages.slice(0, idx), ...finalMessages.slice(idx + 1)];
      }
    }
  }
  const body = {
    model,
    messages: finalMessages,
    stream: true,
  };
  if (!noCustomTemp) body.temperature = config.temperature ?? 0.7;
  // Reasoning effort for GPT-5.x via ChatCompletions
  if (isReasoningModel && reasoningEffort) {
    body.reasoning_effort = reasoningEffort;
  }
  // Newer OpenAI models use max_completion_tokens instead of max_tokens.
  // Les serveurs OpenAI-compatibles non-officiels (vLLM, Ollama, ...) acceptent
  // souvent uniquement max_tokens classique. Détection via isOpenAiOfficial.
  // ── Default max_tokens pour vLLM ──
  // 8192 par défaut : assez pour les longs tool_calls (execute_code avec gros
  // scripts Python génère facilement 3-5k tokens). Si le context est tight,
  // le retry auto baisse dynamiquement à `ctx - input - 1024`.
  // Override via env : VLLM_MAX_TOKENS=N.
  let effectiveMaxTokens = config.maxTokens;
  if (!isOpenAiOfficial) {
    const vllmOverride = parseInt(process.env.VLLM_MAX_TOKENS || '0', 10);
    if (vllmOverride > 0) effectiveMaxTokens = vllmOverride;
    else if (!effectiveMaxTokens || effectiveMaxTokens > 16384) effectiveMaxTokens = 8192;
  }
  if (effectiveMaxTokens) {
    if (isOpenAiOfficial) body.max_completion_tokens = effectiveMaxTokens;
    else body.max_tokens = effectiveMaxTokens;
  }

  // ── Qwen 3.x / DeepSeek-R1 thinking mode ──────────────────────────
  // Par défaut, Qwen 3 émet un raisonnement <think>…</think> AVANT la réponse
  // finale. Si le serveur vLLM n'a PAS --reasoning-parser, tout part dans
  // `content` → l'user voit le thinking en clair. Solution propre :
  // désactiver le thinking via chat_template_kwargs.enable_thinking=false
  // (lu par le template Jinja de Qwen).
  // Override via env : AI_ENABLE_THINKING=1 si tu veux GARDER le thinking
  // (utile si tu as configuré --reasoning-parser côté serveur).
  if (!isOpenAiOfficial) {
    const keepThinking = process.env.AI_ENABLE_THINKING === '1';
    if (!keepThinking) {
      body.chat_template_kwargs = { ...(body.chat_template_kwargs || {}), enable_thinking: false };
    }
  }
  if (tools && tools.length) {
    body.tools = tools;
    // Force sequential tool calls par défaut : évite que le LLM hallucine des
    // IDs / keys quand il a besoin du résultat d'un tool call précédent (ex:
    // search_tools → get_tool_details, spawn_subagent avec depends_on chaînés).
    // Override possible via AI_PARALLEL_TOOL_CALLS=1 pour les cas où la vraie
    // parallélisation (tool calls indépendants) est souhaitée.
    body.parallel_tool_calls = process.env.AI_PARALLEL_TOOL_CALLS === '1';
  }
  // Include usage in streaming response (otherwise totalUsage is always null)
  body.stream_options = { include_usage: true };

  const providerTag = isOpenAiOfficial ? 'openai' : `openai-compat:${baseURL.replace(/^https?:\/\//, '')}`;
  console.log(`[llm-${providerTag}] request: model=${body.model}, tools=${body.tools?.length || 0}, messages=${body.messages?.length || 0}`);

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    // ── Auto-retry si context length dépassé ──────────────────────────
    // vLLM est strict : refuse si input + max_tokens > max_model_len.
    // Parse l'erreur, recalcule max_tokens = ctx - input - 64 (marge), retry.
    // Garde-fou : 1 seul retry pour éviter boucle infinie.
    if (res.status === 400 && /maximum context length/i.test(errText) && !config._isRetry) {
      const m = errText.match(/maximum context length is (\d+).*?prompt contains.*?(\d+) input tokens/i);
      if (m) {
        const ctxMax = parseInt(m[1], 10);
        const inputTokens = parseInt(m[2], 10);
        // Marge 1024 : entre les 2 essais le prompt peut grossir (system reminders
        // injectés par le harness, variation comptage tokenizer côté vLLM, etc.).
        // 64 était trop juste — observé : 30337 → 30402 (+65 tokens) entre 1er et 2e essai.
        const safeOutput = Math.max(256, ctxMax - inputTokens - 1024);
        console.warn(`[llm-openai] 🔄 Context tight (input=${inputTokens}/${ctxMax}). Retry avec max_tokens=${safeOutput} (au lieu de ${effectiveMaxTokens}, marge 1024).`);
        // Recursive retry — config marqué pour éviter loop
        yield* streamOpenAI(messages, tools, { ...config, maxTokens: safeOutput, _isRetry: true });
        return;
      }
    }
    console.error(`[llm-openai] HTTP error ${res.status}: ${errText.slice(0, 500)}`);
    if (res.status === 400 && /maximum context length/i.test(errText)) {
      const m = errText.match(/maximum context length is (\d+).*?requested (\d+) output tokens.*?prompt contains.*?(\d+) input tokens/i);
      if (m) {
        const [, ctx, out, inp] = m;
        console.warn(`[llm-openai] 💡 Context length exceeded (après retry échoué):
  - Modèle context max : ${ctx} tokens
  - Prompt (input)     : ${inp} tokens
  - Output demandé     : ${out} tokens
  - Dépassement        : ${parseInt(inp) + parseInt(out) - parseInt(ctx)} tokens
  → L'historique est trop long. Solutions :
    1. Augmenter --max-model-len côté vLLM (le plus simple)
    2. Reset thread (nouveau message dans un thread vierge)
    3. Réduire le nombre de tools actifs en context`);
      }
    }
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }
  console.log('[llm-openai] stream started');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  // Track tool call builders: index → { id, name, arguments }
  const toolBuilders = new Map();
  let totalUsage = null;
  let stopReasonRaw = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') {
        if (trimmed === 'data: [DONE]') {
          console.log(`[llm-openai] [DONE] → done (usage: ${JSON.stringify(totalUsage)}, stop: ${stopReasonRaw})`);
          yield { type: 'done', usage: totalUsage, stopReasonRaw };
          return;
        }
        continue;
      }
      if (!trimmed.startsWith('data: ')) continue;

      let chunk;
      try { chunk = JSON.parse(trimmed.slice(6)); } catch { continue; }

      // Usage info (if present). Préserve les champs provider pour l'adapter.
      if (chunk.usage) {
        totalUsage = {
          input: chunk.usage.prompt_tokens || 0,
          output: chunk.usage.completion_tokens || 0,
          prompt_tokens: chunk.usage.prompt_tokens || 0,
          completion_tokens: chunk.usage.completion_tokens || 0,
          prompt_tokens_details: chunk.usage.prompt_tokens_details || null,
        };
      }

      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta;
      if (!delta) continue;

      // Text content — strip les <think>...</think> Qwen si jamais le serveur
      // ne sépare pas (= absence de --reasoning-parser). Émet le contenu thinking
      // comme reasoning_delta séparé pour le rendre dans un bloc collapsé.
      if (delta.content) {
        let text = delta.content;
        // Détection simple <think>...</think> ou \n\n suivi de "Let me…" patterns
        // qui collent souvent au début. Plus robust : reconstituer côté assembler
        // mais ici on stream donc on fait du best-effort sur les balises XML.
        if (typeof text === 'string' && /<think>|<\/think>/.test(text)) {
          // Émet chaque partie séparée selon la présence des tags
          const parts = text.split(/(<think>|<\/think>)/);
          let inThink = false;
          for (const part of parts) {
            if (part === '<think>') { inThink = true; continue; }
            if (part === '</think>') { inThink = false; continue; }
            if (!part) continue;
            if (inThink) yield { type: 'reasoning_delta', text: part };
            else yield { type: 'text_delta', text: part };
          }
        } else {
          yield { type: 'text_delta', text };
        }
      }

      // Reasoning content (Qwen 3.x / DeepSeek-R1 avec --reasoning-parser côté vLLM).
      // Le serveur sépare le <think>...</think> de la réponse finale et l'envoie
      // dans delta.reasoning_content. On émet un event distinct que le frontend
      // affichera dans un bloc reasoning collapsé (pas mélangé au content).
      if (delta.reasoning_content) {
        yield { type: 'reasoning_delta', text: delta.reasoning_content };
      }

      // Tool calls
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolBuilders.has(idx)) {
            toolBuilders.set(idx, { id: '', name: '', arguments: '' });
          }
          const b = toolBuilders.get(idx);

          if (tc.id) b.id = tc.id;
          if (tc.function?.name) {
            b.name = tc.function.name;
            yield { type: 'tool_use_start', index: idx, id: b.id, name: b.name };
          }
          if (tc.function?.arguments) {
            b.arguments += tc.function.arguments;
            if (isDebug()) console.log(`[llm-openai] input_delta: ${b.name} +${tc.function.arguments.length}chars`);
            yield { type: 'tool_input_delta', index: idx, id: b.id, name: b.name, text: tc.function.arguments };
          }
        }
      }

      // Finish reason
      if (choice.finish_reason) {
        stopReasonRaw = choice.finish_reason;
        if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop' || choice.finish_reason === 'length') {
          // Emit tool_use_end for all pending builders
          for (const [idx, b] of toolBuilders) {
            let input = {};
            try { input = JSON.parse(b.arguments); } catch {}
            yield { type: 'tool_use_end', index: idx, id: b.id, name: b.name, input };
          }
          toolBuilders.clear();
        }
        // Don't return on 'stop' — with stream_options, the usage chunk arrives
        // AFTER finish_reason. Let the loop continue to capture it, then [DONE] yields done.
      }
    }
  }

  // If stream ended without [DONE]
  for (const [idx, b] of toolBuilders) {
    let input = {};
    try { input = JSON.parse(b.arguments); } catch {}
    yield { type: 'tool_use_end', index: idx, id: b.id, name: b.name, input };
  }
  yield { type: 'done', usage: totalUsage, stopReasonRaw };
}

// Format messages for OpenAI API
function formatMessages(messages) {
  return messages.map(m => {
    if (m.role === 'tool') {
      return { role: 'tool', tool_call_id: m.tool_call_id, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) };
    }
    if (m.role === 'assistant' && m.tool_calls) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.tool_calls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input || {}) },
        })),
      };
    }
    // Content arrays (multimodal) — convert to OpenAI Chat Completions format
    if (Array.isArray(m.content)) {
      const parts = m.content.map(b => {
        if (b.type === 'image') {
          const src = b.source || { data: b.data, media_type: b.media_type };
          return { type: 'image_url', image_url: { url: `data:${src.media_type};base64,${src.data}` } };
        }
        if (b.type === 'document') {
          // OpenAI Chat Completions supports input via "file" content part (type: 'file', file: {file_data})
          const src = b.source || { data: b.data, media_type: b.media_type || 'application/pdf' };
          return {
            type: 'file',
            file: {
              filename: b.name || 'document.pdf',
              file_data: `data:${src.media_type};base64,${src.data}`,
            },
          };
        }
        if (b.type === 'input_audio' || b.type === 'audio') {
          const src = b.source || { data: b.data, media_type: b.media_type || 'audio/mpeg' };
          return {
            type: 'input_audio',
            input_audio: { data: src.data, format: (src.media_type || '').split('/').pop() || 'mp3' },
          };
        }
        return { type: 'text', text: b.text || '' };
      });
      return { role: m.role, content: parts };
    }
    return { role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '') };
  });
}

// Format tools for OpenAI API
function formatTools(tools) {
  if (!tools || !tools.length) return undefined;
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description || '',
      parameters: t.parameters || { type: 'object', properties: {} },
    },
  }));
}

module.exports = { streamOpenAI, formatMessages, formatTools };
