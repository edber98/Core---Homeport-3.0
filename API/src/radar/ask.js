// Interrogation CONVERSATIONNELLE du cerveau (I5).
//
// L'utilisateur pose une question en langage naturel (« où sont mes goulots sur les
// clients industriels ? », « quelles factures relancer ? »). On assemble un CONTEXTE
// factuel à partir de tout le cerveau (graphe + analyse + process de vente segmenté +
// recommandations + modèles) et le LLM répond en s'appuyant DESSUS, avec des chiffres.
// Aucune invention : le LLM ne dispose que des faits fournis.

const { llmCompleteJSON } = require('./llm');

/** Tronque un tableau pour le contexte (token budget). */
function top(arr, n) { return (arr || []).slice(0, n); }

/** Assemble un instantané factuel compact du cerveau pour le workspace. */
async function buildBrainContext(workspaceId) {
  const { graphSummary } = require('./graph/query');
  const { analyzeWorkspace } = require('./analytics');
  const { recommend } = require('./recommendations');
  const { mineSalesProcess } = require('./process/sales-process');

  const [sum, analysis, recos, sales] = await Promise.all([
    graphSummary(workspaceId).catch(() => null),
    analyzeWorkspace(workspaceId).catch(() => ({})),
    recommend(workspaceId).catch(() => ({ recommendations: [] })),
    mineSalesProcess(workspaceId).catch(() => null),
  ]);
  const days = (ms) => Math.round((ms || 0) / 86400000);

  return {
    graphe: sum ? { entites: sum.entities, relations: sum.relations, parType: top(sum.byType, 14).map(b => `${b.subtype || b.coreType}×${b.count}`) } : null,
    financier: analysis.financial,
    goulots_process: top(analysis.bottlenecks, 8).map(b => `${b.process}: ${b.from}→${b.to} (${b.avgDays} j, ${b.count} cas)`),
    retards: top(analysis.delays, 10).map(d => `${d.label || d.type} en « ${d.state} » depuis ${d.sinceDays} j`),
    anomalies: top(analysis.anomalies, 8).map(a => a.reason || `${a.kind} ${a.entity}`),
    ruptures_flux: top(analysis.processGaps, 8).map(g => g.reason),
    goulots_stock: top(analysis.stockRisks, 8).map(s => `${s.product}: stock ${s.stock} / demande ${s.demand} (${s.severity})`),
    processus_vente: sales ? {
      affaires: sales.deals,
      etapes: top(sales.stages, 12).map(s => `${s.stage} (${s.count})`),
      goulots: top(sales.bottlenecks, 6).map(b => `${b.from}→${b.to}: ${days(b.avgDurationMs)} j`),
      par_secteur: top(sales.bySegment, 8).map(s => `${s.segment}: ${s.deals} affaires${s.bottlenecks[0] ? `, goulot ${s.bottlenecks[0].from}→${s.bottlenecks[0].to} ${days(s.bottlenecks[0].avgDurationMs)} j` : ''}`),
    } : null,
    recommandations: top(recos.recommendations, 15).map(r => `[${r.priority}] ${r.title}`),
  };
}

/**
 * Répond à une question en langage naturel sur le cerveau.
 * @returns {Promise<{answer, sources, context}>}
 */
async function askRadar(workspaceId, question, { complete = llmCompleteJSON } = {}) {
  if (!question || !String(question).trim()) return { answer: 'Pose une question sur ton activité.', sources: [], context: null };
  const ctx = await buildBrainContext(workspaceId);
  // RAG : documents pertinents pour la question (avec leur EMPLACEMENT) → l'IA sait
  // « où est le contrat de X / l'analyse technique de Y » et cite le chemin.
  const docs = await require('./doc-index').searchDocs(workspaceId, question, { topK: 6 }).catch(() => []);
  if (docs.length) ctx.documents_pertinents = docs.map(d => ({ nom: d.label, emplacement: d.path, extrait: d.snippet }));
  // Climat relationnel : sentiment des emails, clients mécontents
  // Marge (vente − revient) : rentabilité globale + affaires à faible marge
  const mg = await require('./margin').analyzeMargins(workspaceId).catch(() => null);
  if (mg && mg.totals.revenue > 0) ctx.marge = {
    ca: mg.totals.revenue, cout: mg.totals.cost, marge: mg.totals.margin, taux_pct: mg.totals.rate,
    par_type: Object.entries(mg.byType).map(([k, v]) => `${k}: ${v.rate}%`),
    affaires_faible_marge: mg.lowMargin.slice(0, 5).map(d => `${d.label} (${d.rate}%)`),
  };
  const sent = await require('./sentiment').analyzeSentiment(workspaceId).catch(() => null);
  if (sent && (sent.counts.positif + sent.counts.négatif) > 0) ctx.climat_client = {
    general: sent.overall, score: sent.score, positifs: sent.counts.positif, négatifs: sent.counts.négatif,
    clients_a_risque: sent.byClient.filter(c => c.atRisk).slice(0, 8).map(c => `${c.client} (${c.negatives} plainte(s))`),
  };
  if (typeof complete !== 'function') return { answer: '(LLM indisponible) Voici les faits bruts.', sources: [], context: ctx, documents: docs };

  const out = await complete(`Tu es l'analyste du « Radar d'entreprise ». Réponds à la question de l'utilisateur en t'appuyant UNIQUEMENT sur les FAITS ci-dessous (chiffres réels de son entreprise). Sois précis, cite les chiffres, et n'invente RIEN. Si l'utilisateur cherche un document, indique son NOM et son EMPLACEMENT (chemin). Si l'info manque, dis-le.

## Faits (instantané du cerveau)
${JSON.stringify(ctx, null, 1)}

## Question
${String(question).trim()}

Réponds en JSON : {"answer":"réponse claire en français avec les chiffres et, si pertinent, le chemin du document","sources":["catégorie de fait utilisée", "…"]}`, { maxTokens: 700 }).catch(() => null);

  if (!out || !out.answer) return { answer: 'Je n\'ai pas pu analyser la question. Réessaie.', sources: [], context: ctx, documents: docs };
  return { answer: out.answer, sources: out.sources || [], context: ctx, documents: docs };
}

module.exports = { askRadar, buildBrainContext };
