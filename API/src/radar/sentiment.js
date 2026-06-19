// Radar — ANALYSE DE SENTIMENT des communications (I8).
//
// Lit les emails (Communication.email), détermine leur tonalité (attribut `sentiment`
// posé à la source, sinon lexique FR/EN léger), et AGRÈGE par client → on repère les
// clients MÉCONTENTS (réclamations, retards, plaintes) et le climat général. Alimente
// askRadar (climat) et les recommandations (relation client à risque). Zéro infra.

const NEG = /m[ée]content|inadmissible|inacceptable|r[ée]clamation|plainte|retard|probl[èe]me|d[ée]?[çc]u|urgent|scandaleux|catastrophe|jamais|aucune r[ée]ponse|relance|impay[ée]|litige|annul|r[ée]silier|angry|complaint|delay|unacceptable|refund|disappointed/i;
const POS = /merci|parfait|satisfait|excellent|ravi|g[ée]nial|super|nickel|au top|bravo|content|appr[ée]ci|thanks|great|perfect|happy|pleased/i;

/** Score une tonalité depuis un texte (fallback quand `sentiment` absent). */
function scoreText(text) {
  const s = String(text || '');
  const neg = NEG.test(s), pos = POS.test(s);
  if (neg && !pos) return 'négatif';
  if (pos && !neg) return 'positif';
  return 'neutre';
}
const VAL = { 'négatif': -1, 'neutre': 0, 'positif': 1 };

/**
 * Analyse le sentiment des communications du workspace.
 * @returns {{ overall, counts, score, byClient: [{client, score, negatives, total, lastComplaint}], complaints: [...] }}
 */
async function analyzeSentiment(workspaceId, { sinceDays = 180 } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');

  const emails = await RadarEntity.find({ workspaceId, coreType: 'Communication', subtype: 'email' })
    .select('canonicalKey label attributes firstSeenAt').lean();
  if (!emails.length) return { overall: 'neutre', counts: { positif: 0, neutre: 0, négatif: 0 }, score: 0, byClient: [], complaints: [] };

  // sentiment par email (attribut source, sinon lexique sur label+body)
  const sentOf = (e) => e.attributes?.sentiment || scoreText(`${e.label} ${e.attributes?.body || ''}`);

  // rattachement email → client : relation `references` role 'client' (ou party_of)
  const rels = await RadarRelation.find({ workspaceId, type: { $in: ['references', 'party_of'] } }).select('fromKey toKey role').lean();
  const clients = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'client' }).select('canonicalKey label').lean();
  const clientKeys = new Set(clients.map(c => c.canonicalKey));
  const nameOf = new Map(clients.map(c => [c.canonicalKey, c.label]));
  const clientOfEmail = new Map();
  for (const r of rels) { if (clientKeys.has(r.toKey) && !clientOfEmail.has(r.fromKey)) clientOfEmail.set(r.fromKey, r.toKey); }

  const counts = { positif: 0, neutre: 0, négatif: 0 };
  const byClient = new Map();   // clientKey -> { total, neg, sum, lastComplaint }
  const complaints = [];
  for (const e of emails) {
    const s = sentOf(e); counts[s] = (counts[s] || 0) + 1;
    const ck = clientOfEmail.get(e.canonicalKey);
    if (ck) {
      const agg = byClient.get(ck) || { total: 0, neg: 0, sum: 0, lastComplaint: null };
      agg.total++; agg.sum += VAL[s] || 0; if (s === 'négatif') { agg.neg++; agg.lastComplaint = e.label; }
      byClient.set(ck, agg);
    }
    if (s === 'négatif') complaints.push({ email: e.label, client: ck ? nameOf.get(ck) : null, excerpt: String(e.attributes?.body || e.label).slice(0, 160), at: e.firstSeenAt });
  }

  const total = emails.length;
  const score = Math.round(((counts.positif - counts.négatif) / total) * 100) / 100;
  const overall = score > 0.15 ? 'positif' : (score < -0.15 ? 'négatif' : 'neutre');

  const byClientArr = [...byClient.entries()].map(([key, a]) => ({
    client: nameOf.get(key) || key, clientKey: key,
    score: Math.round((a.sum / a.total) * 100) / 100, negatives: a.neg, total: a.total,
    atRisk: a.neg >= 2 || (a.total >= 2 && a.sum < 0), lastComplaint: a.lastComplaint,
  })).sort((x, y) => x.score - y.score);

  return { overall, counts, score, byClient: byClientArr, complaints: complaints.slice(0, 20) };
}

module.exports = { analyzeSentiment, scoreText };
