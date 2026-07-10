// Radar — ANALYSE RH & POINTAGE (I11).
//
// À partir du graphe, on regarde les PERSONNES (Party/person), leur CHARGE de travail
// (relations `assigned_to` pointant vers la personne → WorkItem assignés), le statut de
// ces items (ouverts vs terminés) et le TEMPS passé SI un attribut de pointage existe
// (hours / timespent / duration / workload… détecté DYNAMIQUEMENT, jamais codé en dur).
// Enfin on DÉCOUVRE des indices de process RH (congés, onboarding, paie, recrutement…)
// en scannant ce que le graphe contient réellement — on ne présuppose rien. 100% dynamique.

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };

// Clés d'attribut candidates pour le POINTAGE — on prend la première qui porte une valeur.
// (le graphe peut venir de n'importe quel connecteur : on couvre les conventions usuelles)
const HOUR_KEYS = ['hours', 'hoursReal', 'timespent', 'time_spent', 'duration', 'durationEffective', 'duration_effective', 'planned_workload', 'workload', 'temps', 'heures'];
// Un attribut en SECONDES (convention Dolibarr) → converti en heures.
const SECOND_KEYS = new Set(['duration', 'durationEffective', 'duration_effective', 'planned_workload', 'timespent', 'time_spent', 'hoursReal']);

function hoursOf(attrs) {
  if (!attrs) return 0;
  for (const k of HOUR_KEYS) {
    if (attrs[k] != null && String(attrs[k]).trim() !== '') {
      const raw = num(attrs[k]);
      if (raw <= 0) continue;
      // heuristique : si la valeur ressemble à des secondes (clé connue OU très grande), on convertit
      return SECOND_KEYS.has(k) && raw > 1000 ? Math.round((raw / 3600) * 100) / 100 : raw;
    }
  }
  return 0;
}

// Un item est OUVERT s'il n'est ni terminé ni clos (statut/progression). Tolérant aux libellés FR/EN.
const DONE_RE = /termin|done|clos|ferm[ée]|complete|achev|r[ée]solu|resolved|closed|annul|cancel/i;
function isOpen(attrs) {
  if (!attrs) return true;
  if (num(attrs.progress) >= 100) return false;
  const st = String(attrs.status || attrs.state || '').trim();
  if (st && DONE_RE.test(st)) return false;
  return true;
}

// Indices de PROCESS RH — on cherche ces thèmes dans les libellés réels du graphe.
// La liste sert de DÉTECTEUR : on ne rapporte que ce qui existe vraiment (count > 0).
const HR_THEMES = [
  { hint: 'congés / absences', re: /cong[ée]s?|absence|rtt|vacances|leave|pto|time[- ]?off/i },
  { hint: 'onboarding / intégration', re: /onboarding|int[ée]gration|arriv[ée]e collaborateur|welcome|prise de poste/i },
  { hint: 'recrutement', re: /recrut|hiring|candidat|entretien d.embauche|offre d.emploi/i },
  { hint: 'paie / bulletins', re: /paie|bulletin|fiche.?de.?paie|salaire|payroll|payslip/i },
  { hint: 'entretiens / évaluations', re: /entretien (annuel|professionnel|individuel)|[ée]valuation|appraisal|one[- ]?on[- ]?one/i },
  { hint: 'formation', re: /formation interne|montée en comp[ée]tence|e[- ]?learning|training/i },
  { hint: 'note de frais', re: /note de frais|expense report|remboursement frais/i },
  { hint: 'dossier RH', re: /\bRH\b|ressources humaines|human resources|\bHR\b/i },
];

/**
 * Analyse RH + pointage du workspace.
 * @returns {{ people:[{name, openItems, hours}], totals:{people, assignedItems, hours}, processHints:[String] }}
 */
async function analyzeHR(workspaceId, opts = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');

  // 1) PERSONNES — index canonique + alias → personne (résolution alias comme margin.js)
  const persons = await RadarEntity.find({ workspaceId, coreType: 'Party', subtype: 'person' })
    .select('canonicalKey aliasKeys label roles').lean();
  const personByKey = new Map();
  for (const p of persons) {
    const v = { canon: p.canonicalKey, name: p.label || p.canonicalKey, roles: p.roles || [] };
    personByKey.set(p.canonicalKey, v);
    for (const a of p.aliasKeys || []) personByKey.set(a, v);
  }

  // 2) WORKITEMS — index canonique + alias → item (pour lire statut / heures de pointage)
  const items = await RadarEntity.find({ workspaceId, coreType: 'WorkItem' })
    .select('canonicalKey aliasKeys label subtype attributes').lean();
  const itemByKey = new Map();
  for (const it of items) {
    itemByKey.set(it.canonicalKey, it);
    for (const a of it.aliasKeys || []) itemByKey.set(a, it);
  }

  // 3) RELATIONS assigned_to : fromKey = item, toKey = personne (sens vérifié dynamiquement
  //    car selon le connecteur l'une ou l'autre extrémité peut porter la personne)
  const assigned = await RadarRelation.find({ workspaceId, type: 'assigned_to' })
    .select('fromKey toKey role').lean();

  const agg = new Map();   // person.canon → { name, roles, openItems, totalItems, hours }
  const ensure = (pv) => {
    let a = agg.get(pv.canon);
    if (!a) { a = { name: pv.name, roles: pv.roles, openItems: 0, totalItems: 0, hours: 0 }; agg.set(pv.canon, a); }
    return a;
  };
  // amorce toutes les personnes connues (même sans charge) pour ne rien masquer
  for (const p of persons) ensure(personByKey.get(p.canonicalKey));

  let assignedItems = 0;
  for (const r of assigned) {
    // déterminer quel bout est la personne et quel bout est l'item
    let pv = personByKey.get(r.toKey) || personByKey.get(r.fromKey);
    let item = itemByKey.get(r.fromKey) || itemByKey.get(r.toKey);
    if (!pv) continue;                       // pas rattaché à une personne connue → ignoré
    assignedItems++;
    const a = ensure(pv);
    a.totalItems++;
    const attrs = item ? item.attributes : null;
    if (isOpen(attrs)) a.openItems++;
    a.hours += hoursOf(attrs);               // 0 si aucun pointage présent (cas fréquent)
  }

  const people = [...agg.values()]
    .map((a) => ({ name: a.name, openItems: a.openItems, hours: Math.round(a.hours * 100) / 100 }))
    .sort((x, y) => y.openItems - x.openItems);

  const totalHours = Math.round(people.reduce((s, p) => s + p.hours, 0) * 100) / 100;

  // 4) DÉCOUVERTE process RH — on scanne TOUTES les entités (labels + sous-types) et on ne
  //    retient que les thèmes effectivement présents, avec leur volume réel.
  const allLabels = await RadarEntity.find({ workspaceId })
    .select('label subtype roles').lean();
  const processHints = [];
  for (const theme of HR_THEMES) {
    let count = 0;
    for (const e of allLabels) {
      const hay = `${e.label || ''} ${e.subtype || ''} ${(e.roles || []).join(' ')}`;
      if (theme.re.test(hay)) count++;
    }
    if (count > 0) processHints.push(`${theme.hint} — ${count} élément(s) détecté(s)`);
  }
  // signal de pointage : présent ou non dans le graphe (utile pour piloter la confiance)
  const hasTimeTracking = people.some((p) => p.hours > 0);
  if (!hasTimeTracking && people.length) {
    processHints.push('pointage / temps passé — aucun attribut de durée trouvé sur les items (charge mesurée en nb d\'items)');
  }

  return {
    people,
    totals: {
      people: persons.length,
      assignedItems,
      hours: totalHours,
    },
    processHints,
  };
}

module.exports = { analyzeHR };
