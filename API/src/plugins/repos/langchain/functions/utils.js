function compactJson(v) { try { return JSON.stringify(v); } catch { return String(v); } }
function parseJson(v, label, fallback) { if (v === undefined || v === null || v === "") return fallback; if (typeof v === "object") return v; try { return JSON.parse(String(v)); } catch { throw new Error("JSON invalide dans " + label + "."); } }
async function chat(opts, model, messages) {
  const c = (opts && opts.credentials) || {};
  if (!c.apiKey) return { ok: false, error: "Clé API OpenAI requise pour les nœuds LangChain." };
  let ChatOpenAI;
  try { ({ ChatOpenAI } = require("@langchain/openai")); } catch { return { ok: false, error: "Le package '@langchain/openai' n'est pas installé." }; }
  const llm = new ChatOpenAI({ apiKey: c.apiKey, model: model || c.defaultModel || "gpt-4o-mini", temperature: Number(c.temperature || 0) });
  const res = await llm.invoke(messages);
  return { ok: true, content: typeof res.content === "string" ? res.content : compactJson(res.content), raw: res };
}
function response(data) { return { ok: true, status: "ok", text: data.content || data.text || "", data, result_json: compactJson(data) }; }
function list(items) { return { ok: true, items: items.map((v, i) => ({ id: String(i), name: v.name || "Chunk " + (i + 1), status: "", url: "", text: v.text || String(v), result_json: compactJson(v) })), totalCount: items.length, nextCursor: "", data: items, result_json: compactJson(items) }; }
async function run(key, inputs, opts) {
  const d = inputs || {};
  try {
    if (key === "langchain_prompt_format") { const vars = parseJson(d.variables, "variables", {}); let text = d.template || ""; for (const [k, v] of Object.entries(vars)) text = text.replace(new RegExp("\\{" + k + "\\}", "g"), String(v)); return response({ text }); }
    if (key === "langchain_text_split") { const size = Number(d.chunkSize || 1000); const overlap = Number(d.chunkOverlap || 100); const out = []; for (let i = 0; i < String(d.text || "").length; i += Math.max(1, size - overlap)) out.push({ text: String(d.text).slice(i, i + size) }); return list(out); }
    if (key === "langchain_embeddings_create") { const texts = parseJson(d.texts, "texts", []); const c = (opts && opts.credentials) || {}; let OpenAIEmbeddings; try { ({ OpenAIEmbeddings } = require("@langchain/openai")); } catch { return { ok: false, error: "Le package '@langchain/openai' n'est pas installé." }; } const emb = new OpenAIEmbeddings({ apiKey: c.apiKey, model: d.model || "text-embedding-3-small" }); const vectors = await emb.embedDocuments(texts); return response({ vectors, count: vectors.length }); }
    if (key === "langchain_chat_invoke") { const r = await chat(opts, d.model, [[ "system", d.system || "Tu es un assistant utile." ], [ "human", d.prompt ]]); return r.ok ? response(r) : r; }
    if (key === "langchain_text_summarize") { const r = await chat(opts, d.model, [[ "system", "Résume le texte de manière concise." ], [ "human", d.text ]]); return r.ok ? response(r) : r; }
    if (key === "langchain_json_extract") { const r = await chat(opts, d.model, [[ "system", "Extrait les informations demandées et réponds uniquement en JSON valide. Schéma: " + compactJson(parseJson(d.schema, "schema", {})) ], [ "human", d.text ]]); return r.ok ? response(r) : r; }
    if (key === "langchain_classify") { const r = await chat(opts, d.model, [[ "system", "Classe le texte dans un des labels suivants et réponds en JSON: " + compactJson(parseJson(d.labels, "labels", [])) ], [ "human", d.text ]]); return r.ok ? response(r) : r; }
    if (key === "langchain_rag_answer") { const docs = parseJson(d.documents, "documents", []); const context = docs.map((x, i) => "[" + (i + 1) + "] " + (x.text || x.content || x)).join("\n\n"); const r = await chat(opts, d.model, [[ "system", "Réponds à partir du contexte fourni. Cite les numéros de sources utiles." ], [ "human", "Contexte:\n" + context + "\n\nQuestion: " + d.question ]]); return r.ok ? response(r) : r; }
    return { ok: false, error: "Action inconnue." };
  } catch (e) { return { ok: false, error: e.message }; }
}
module.exports = { utils: { run, parseJson } };
