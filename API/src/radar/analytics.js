// Radar — moteur d'analyse (cerveau, Étages 4-5) : transforme le graphe + le
// process mining en INSIGHTS actionnables, scorés. Déterministe, sans LLM.
//   - goulots d'étranglement (transitions les plus lentes des processus),
//   - retards (entités bloquées dans un état non terminal trop longtemps),
//   - anomalies de corrélation (dossier/projet mal nommé à la main → matching flou),
//   - synthèse financière (CA encaissé / en attente, projection).

const { normalize } = require('./graph/correlate');
const { mineProcesses, stateFieldOf, canonState } = require('./process/miner');

const DAY = 86400000;
const TERMINAL = new Set(['payée', 'annulée', 'refusé', 'livrée', 'signé', 'paid', 'cancelled']);

/** Distance de Levenshtein (édition). Pure. */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]; dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[m];
}
/** Deux mots se ressemblent-ils (tolère les fautes de frappe, mais PAS un simple
 *  chiffre qui change comme prov1/prov2 = refs distinctes) ? Pure. */
function fuzzyTokenMatch(a, b) {
  if (a === b) return true;
  // un seul caractère qui diffère ET c'est un chiffre → réfs distinctes, pas un doublon
  if (a.length === b.length) {
    let diff = -1, n = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { n++; diff = i; }
    if (n === 1 && (/[0-9]/.test(a[diff]) || /[0-9]/.test(b[diff]))) return false;
  }
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length) >= 0.85;
}
/** Similarité de noms tolérante aux fautes (fraction des mots qui matchent). Pure. 0..1 */
function nameSimilarity(a, b) {
  const A = normalize(a).split(' ').filter(w => w.length > 1);
  const B = normalize(b).split(' ').filter(w => w.length > 1);
  if (!A.length || !B.length) return 0;
  let matched = 0;
  for (const ta of A) if (B.some(tb => fuzzyTokenMatch(ta, tb))) matched++;
  const tokenScore = matched / Math.max(A.length, B.length);
  // Repli COMPACT (sans espaces) : capte les variantes concaténées / mal orthographiées
  // (« Joly Formations » vs « jolyformation », « jolyformations »…). La tokenisation par
  // mots y échoue (1 token vs 2). Garde-fous :
  //  - longueur ≥ 6 : les sigles courts (ITBS vs IT-BS) restent en zone grise → LLM ;
  //  - même règle chiffre que fuzzyTokenMatch : un SEUL caractère qui diffère et c'est un
  //    chiffre (PROV14 vs PROV15) = réfs distinctes, jamais un doublon.
  const ca = A.join(''), cb = B.join('');
  let compactScore = 0;
  if (ca.length >= 6 && cb.length >= 6) {
    let digitDiff = false;
    if (ca.length === cb.length) {
      let n = 0, diff = -1;
      for (let i = 0; i < ca.length; i++) if (ca[i] !== cb[i]) { n++; diff = i; }
      digitDiff = n === 1 && (/[0-9]/.test(ca[diff]) || /[0-9]/.test(cb[diff]));
    }
    if (!digitDiff) compactScore = 1 - levenshtein(ca, cb) / Math.max(ca.length, cb.length);
  }
  return Math.max(tokenScore, compactScore);
}

const PROC_FR = { invoice: 'Facturation', quote: 'Devis', order: 'Commandes', task: 'Tâches', ticket: 'Support' };

/** Goulots : transitions de processus les plus lentes, AVEC contexte détaillé. */
async function findBottlenecks(workspaceId) {
  const procs = await mineProcesses(workspaceId);
  const out = [];
  for (const p of procs) {
    const procName = PROC_FR[p.subtype] || p.subtype || p.coreType;
    for (const t of p.transitions) {
      if (t.avgDurationMs > 3 * DAY && t.count >= 2) {
        const days = Math.round(t.avgDurationMs / DAY);
        out.push({
          process: procName, from: t.from, to: t.to, avgDays: days, count: t.count,
          score: Math.min(100, Math.round(days * t.count)),
          description: `Processus « ${procName} » : le passage de « ${t.from} » à « ${t.to} » prend en moyenne ${days} jours sur ${t.count} cas observés — point de ralentissement.`,
        });
      }
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 10);
}

/** Retards : entités bloquées dans un état NON terminal depuis longtemps (via deltas). */
async function findDelays(workspaceId, { stuckDays = 14 } = {}) {
  const RadarDelta = require('../db/models/radar-delta.model');
  const RadarMapping = require('../db/models/radar-mapping.model');
  const mappings = await RadarMapping.find({ status: 'active', $or: [{ workspaceId }, { workspaceId: null }] }).lean();
  const mapByType = new Map();
  for (const m of mappings) if (stateFieldOf(m)) { const c = mapByType.get(m.rawEntityType); if (!c || (m.workspaceId && !c.workspaceId)) mapByType.set(m.rawEntityType, m); }

  const RadarConnector = require('../db/models/radar-connector.model');
  const RadarEntity = require('../db/models/radar-entity.model');
  const SYS_FR = { dolibarr: 'Dolibarr', nextcloud: 'Nextcloud', nextcloudfiles: 'Nextcloud', openproject: 'OpenProject', gmail: 'Email', smtp_imap: 'Email', home_assistant: 'Home Assistant' };
  const provByConn = new Map((await RadarConnector.find({ workspaceId }).select('providerKey').lean()).map(c => [String(c._id), c.providerKey]));

  // dernier état connu par entité
  const deltas = await RadarDelta.find({ workspaceId, entityType: { $in: [...mapByType.keys()] } })
    .select('entityType entityKey after occurredAt connectorId').sort({ occurredAt: 1 }).lean();
  const last = new Map();
  for (const d of deltas) {
    const m = mapByType.get(d.entityType); if (!m) continue;
    const sf = stateFieldOf(m);
    const st = canonState(d.after ? d.after[sf.rawField] : undefined, sf.valueMap);
    const prov = provByConn.get(String(d.connectorId)) || String(d.entityType);
    if (st) last.set(`${prov}:${d.entityType}:${d.entityKey}`, { canon: `${prov}:${d.entityType}:${d.entityKey}`, type: m.target.subtype, state: st, at: d.occurredAt, prov });
  }
  // libellés réels des entités concernées
  const canons = [...last.keys()];
  const labelBy = new Map();
  for (const e of await RadarEntity.find({ workspaceId, $or: [{ canonicalKey: { $in: canons } }, { aliasKeys: { $in: canons } }] }).select('canonicalKey aliasKeys label').lean()) {
    labelBy.set(e.canonicalKey, e.label); for (const a of e.aliasKeys || []) labelBy.set(a, e.label);
  }
  const now = Date.now();
  const out = [];
  for (const v of last.values()) {
    if (TERMINAL.has(v.state)) continue;
    const days = Math.round((now - new Date(v.at).getTime()) / DAY);
    if (days < stuckDays) continue;
    const system = SYS_FR[String(v.prov).toLowerCase()] || v.prov;
    const label = labelBy.get(v.canon) || v.canon;
    out.push({ type: v.type, label, system, state: v.state, sinceDays: days, score: Math.min(100, days),
      reason: `« ${label} » (${system}) est bloqué dans l'état « ${v.state} » depuis ${days} jours.` });
  }
  return out.sort((a, b) => b.sinceDays - a.sinceDays).slice(0, 15);
}

/** Anomalies de corrélation : dossiers/projets non rattachés à un client, avec
 *  suggestion par similarité de nom (cas du nom saisi à la main, presque pareil). */
async function findCorrelationAnomalies(workspaceId) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');

  const entities = await RadarEntity.find({ workspaceId }).select('canonicalKey aliasKeys coreType subtype label roles attributes sources').lean();
  const byKey = new Map();
  for (const e of entities) { byKey.set(e.canonicalKey, e); for (const a of e.aliasKeys || []) byKey.set(a, e); }
  const resolve = (k) => { const e = byKey.get(k); return e ? e.canonicalKey : k; };

  const parties = entities.filter(e => e.coreType === 'Party');
  const linked = new Set();
  for (const r of await RadarRelation.find({ workspaceId }).select('fromKey toKey').lean()) {
    const from = resolve(r.fromKey), to = resolve(r.toKey);
    if (parties.find(p => p.canonicalKey === to)) linked.add(from);
    if (parties.find(p => p.canonicalKey === from)) linked.add(to);
  }

  const SYS_FR = { dolibarr: 'Dolibarr', nextcloud: 'Nextcloud', nextcloudfiles: 'Nextcloud', openproject: 'OpenProject', gmail: 'Email', smtp_imap: 'Email', home_assistant: 'Home Assistant' };
  const sysOf = (e) => { const p = e.sources && e.sources[0] ? e.sources[0].providerKey : String(e.canonicalKey).split(':')[0]; return SYS_FR[String(p).toLowerCase()] || p; };
  const out = [];
  for (const e of entities) {
    // PAR DOSSIER : on ne signale QUE les dossiers/projets (pas chaque fichier — un
    // fichier hérite du rattachement de son dossier). Évite le bruit à la racine.
    if (!['Asset', 'Project'].includes(e.coreType)) continue;
    if (linked.has(e.canonicalKey)) continue;            // déjà rattaché → OK
    const system = sysOf(e), path = e.attributes?.path;
    let best = null, bestSim = 0;
    for (const p of parties) { const s = nameSimilarity(e.label, p.label); if (s > bestSim) { bestSim = s; best = p; } }
    if (best && bestSim >= 0.4 && bestSim < 1) {
      out.push({ kind: 'near_miss', entity: e.label, type: e.subtype, system, path, suggestedClient: best.label, similarity: Math.round(bestSim * 100), score: Math.round(bestSim * 80),
        entityKey: e.canonicalKey, suggestedClientKey: best.canonicalKey,
        reason: `Élément « ${e.label} » de ${system} non rattaché — ressemble à « ${best.label} » (nom saisi à la main ?).` });
    } else {
      out.push({ kind: 'orphan', entity: e.label, type: e.subtype, system, path, score: 40,
        reason: `Élément « ${e.label} » de ${system} non rattaché à un client connu.` });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 20);
}

/** Synthèse financière : factures par état de paiement (CA encaissé / en attente). */
async function financialSummary(workspaceId) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const invoices = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: { $in: ['invoice', 'supplier_invoice'] } })
    .select('subtype label attributes').lean();
  let billed = 0, paid = 0, outstanding = 0, count = 0, paidCount = 0;
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  for (const inv of invoices) {
    const amt = num(inv.attributes?.amount_total);
    const state = inv.attributes?.state, pay = inv.attributes?.payment_state;
    count++; billed += amt;
    const isPaid = state === 'payée' || pay === 'payée' || state === 'paid';
    if (isPaid) { paid += amt; paidCount++; } else if (state !== 'annulée') outstanding += amt;
  }
  return {
    invoices: count, paidInvoices: paidCount,
    billed: Math.round(billed), paid: Math.round(paid), outstanding: Math.round(outstanding),
    collectionRate: billed ? Math.round((paid / billed) * 100) : 0,
  };
}

// Goulots de STOCK : pour chaque produit, on agrège la DEMANDE (quantités des
// lignes de facture/devis/commande qui le référencent) et on la compare au stock
// disponible. Un produit très demandé avec un stock faible = rupture imminente,
// goulot d'approvisionnement qui bloque la production/livraison.
async function findStockRisks(workspaceId, { coverDays = 30 } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');
  const products = await RadarEntity.find({ workspaceId, coreType: 'Asset', subtype: 'product' })
    .select('canonicalKey aliasKeys label attributes').lean();
  if (!products.length) return [];
  // index toute-clé → produit
  const byKey = new Map();
  for (const p of products) { byKey.set(p.canonicalKey, p); for (const a of p.aliasKeys || []) byKey.set(a, p); }
  // demande agrégée par produit (relations references/line_item)
  const rels = await RadarRelation.find({ workspaceId, type: 'references', role: 'line_item' }).select('toKey evidence').lean();
  const demand = new Map();  // canonicalKey → { qty, refs }
  for (const r of rels) {
    const p = byKey.get(r.toKey); if (!p) continue;
    const q = parseFloat(String(r.evidence?.qty ?? 1)) || 1;
    const cur = demand.get(p.canonicalKey) || { qty: 0, refs: 0 };
    cur.qty += q; cur.refs += 1; demand.set(p.canonicalKey, cur);
  }
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
  // Agrégation par LIBELLÉ : des doublons de produit (même article ressaisi) ne
  // doivent pas afficher le goulot plusieurs fois. On somme la demande, on garde
  // le stock max observé (le réel) et on additionne les références.
  const byLabel = new Map();
  for (const p of products) {
    if (p.attributes?.type === 'service') continue;          // un service n'a pas de stock
    const stock = num(p.attributes?.stock);
    const d = demand.get(p.canonicalKey);
    if (stock == null || !d || d.qty <= 0) continue;
    const key = (p.label || p.canonicalKey).trim().toLowerCase();
    const cur = byLabel.get(key) || { entityKey: p.canonicalKey, product: p.label, stock: 0, qty: 0, refs: 0 };
    cur.stock = Math.max(cur.stock, stock);
    cur.qty += d.qty; cur.refs += d.refs;
    byLabel.set(key, cur);
  }
  const risks = [];
  for (const c of byLabel.values()) {
    const coverage = c.stock / c.qty;
    if (coverage <= 1.2) {
      risks.push({
        entityKey: c.entityKey, product: c.product,
        stock: c.stock, demand: Math.round(c.qty), references: c.refs,
        coverage: Math.round(coverage * 100) / 100,
        severity: coverage < 0.5 ? 'high' : coverage < 1 ? 'medium' : 'low',
        reason: coverage < 1
          ? `Stock (${c.stock}) insuffisant pour la demande (${Math.round(c.qty)}) — rupture probable`
          : `Stock (${c.stock}) à peine suffisant pour la demande (${Math.round(c.qty)})`,
      });
    }
  }
  return risks.sort((a, b) => a.coverage - b.coverage);
}

// Ruptures de PROCESS — DYNAMIQUE (aucun flux codé en dur). On APPREND le flux réel
// de l'entreprise : pour chaque type de pièce, quel est son prédécesseur le plus
// FRÉQUENT (devis→commande→facture, ou lead→facture, ou tout autre flux métier
// spécifique). Puis on signale les pièces qui DÉVIENT de ce flux majoritaire.
// → s'adapte à chaque métier, détecte des ruptures non prédéfinies.
async function findProcessGaps(workspaceId, { minSupport = 3, dominance = 0.6 } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');
  const txs = await RadarEntity.find({ workspaceId, coreType: 'Transaction' })
    .select('canonicalKey aliasKeys subtype label attributes').lean();
  if (txs.length < minSupport) return [];
  const keyToCanon = new Map(), subtypeByKey = new Map();
  for (const t of txs) { keyToCanon.set(t.canonicalKey, t.canonicalKey); subtypeByKey.set(t.canonicalKey, t.subtype); for (const a of t.aliasKeys || []) { keyToCanon.set(a, t.canonicalKey); subtypeByKey.set(a, t.subtype); } }

  const rels = await RadarRelation.find({ workspaceId, type: 'derived_from', fromKey: { $in: [...keyToCanon.keys()] } }).select('fromKey toKey').lean();
  const predsOf = new Map();
  for (const r of rels) { const f = keyToCanon.get(r.fromKey); if (!f) continue; const a = predsOf.get(f) || []; a.push(subtypeByKey.get(r.toKey) || subtypeByKey.get(keyToCanon.get(r.toKey))); predsOf.set(f, a); }

  // 1) APPRENTISSAGE : par subtype, distribution des subtypes prédécesseurs observés
  const dist = new Map();   // subtype → { total, withPred, predCount:{subtype:n} }
  for (const t of txs) {
    const d = dist.get(t.subtype) || { total: 0, withPred: 0, predCount: {} };
    d.total++;
    const preds = (predsOf.get(t.canonicalKey) || []).filter(Boolean);
    if (preds.length) { d.withPred++; for (const ps of new Set(preds)) d.predCount[ps] = (d.predCount[ps] || 0) + 1; }
    dist.set(t.subtype, d);
  }
  // 2) flux attendu = prédécesseur MAJORITAIRE quand il est suffisamment dominant
  const expectedPred = new Map();
  for (const [sub, d] of dist) {
    if (d.withPred < minSupport) continue;
    const best = Object.entries(d.predCount).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] / d.withPred >= dominance) expectedPred.set(sub, { pred: best[0], rate: best[1] / d.total });
  }

  // 3) DÉVIATIONS : pièces qui n'ont pas le prédécesseur attendu appris.
  // Libellés résolus DYNAMIQUEMENT depuis le registre d'ontologie (aucun dictionnaire codé en dur).
  const fr = await require('./graph/type-labels').loadTypeLabels();
  const gaps = [];
  for (const t of txs) {
    const exp = expectedPred.get(t.subtype); if (!exp) continue;
    const preds = (predsOf.get(t.canonicalKey) || []).filter(Boolean);
    if (!preds.includes(exp.pred)) {
      gaps.push({
        entityKey: t.canonicalKey, label: t.label, subtype: t.subtype, missing: exp.pred,
        severity: exp.rate >= 0.8 ? 'high' : 'medium',
        reason: `${fr(t.subtype)} « ${t.label} » sans ${fr(exp.pred)} en amont — ${Math.round(exp.rate * 100)}% des « ${fr(t.subtype)} » en ont un (flux appris)`,
      });
    }
  }
  return gaps.sort((a, b) => (b.severity === 'high' ? 1 : 0) - (a.severity === 'high' ? 1 : 0));
}

async function analyzeWorkspace(workspaceId) {
  const [bottlenecks, delays, anomalies, financial, stockRisks, processGaps] = await Promise.all([
    findBottlenecks(workspaceId), findDelays(workspaceId), findCorrelationAnomalies(workspaceId), financialSummary(workspaceId), findStockRisks(workspaceId), findProcessGaps(workspaceId),
  ]);
  return { bottlenecks, delays, anomalies, financial, stockRisks, processGaps };
}

module.exports = { analyzeWorkspace, findBottlenecks, findDelays, findCorrelationAnomalies, financialSummary, findStockRisks, findProcessGaps, nameSimilarity };
