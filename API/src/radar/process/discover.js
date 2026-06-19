// Découverte DYNAMIQUE des processus de l'entreprise — AUCUN nom codé en dur.
//
// On ne suppose pas « le processus de vente ». On découvre, selon les acteurs et la
// sémantique réelle, les FAMILLES de processus que l'entreprise exécute (vente de
// matériel industriel, développement webapp, SAV mail→ticket→résolution, interopérabilité
// expert-comptable…). Le NOM de chaque processus est GÉNÉRÉ PAR LE LLM à partir de ses
// activités réelles + le secteur dominant des cas + la nature des projets. Fallback :
// le libellé de rôle du registre d'ontologie. Le DFG/étapes/délais émergent des données.

const { llmCompleteJSON } = require('../llm');

/** Nom du processus, généré dynamiquement par le LLM depuis le contenu réel. */
async function nameProcess({ roleLabel, segments, activities, complete }) {
  const fallback = `Processus ${roleLabel}${segments[0] ? ` — ${segments[0]}` : ''}`;
  if (typeof complete !== 'function') return fallback;
  const out = await complete(`Nomme CONCIS (3-6 mots, en français) le processus métier décrit par ces faits réels.
Acteur principal : ${roleLabel}
Secteur(s) client : ${segments.join(', ') || 'n/a'}
Étapes observées : ${activities.slice(0, 12).join(' ; ')}
Réponds en JSON : {"name":"…"}`, { maxTokens: 80 }).catch(() => null);
  return (out && out.name && String(out.name).trim()) || fallback;
}

/** @returns {Promise<{ processes: Array<{ key, name, caseRole, cases, transitions, ... }> }>} */
async function discoverProcesses(workspaceId, { complete = llmCompleteJSON } = {}) {
  const { mineCrossProcess } = require('./cross-miner');
  const { roleLabel } = require('../graph/ontology');
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  // axes = rôles d'AFFAIRE réellement présents (les rôles internes ne sont pas des
  // axes de processus). On ne nomme rien en dur : roleLabel vient de l'ontologie.
  const roles = await RadarEntity.distinct('roles', { workspaceId, coreType: 'Party' }).catch(() => []);
  const INTERNAL = new Set(['employee', 'user', 'staff', 'author', 'assignee', 'membre', 'owner']);
  const axes = roles.filter(r => r && !INTERNAL.has(r));

  // segment dominant par rôle (pour situer la famille de processus)
  const parties = await RadarEntity.find({ workspaceId, coreType: 'Party' }).select('canonicalKey aliasKeys roles attributes').lean();
  const segByKey = new Map();
  for (const p of parties) { const s = p.attributes?.segmentLabel || p.attributes?.segment; if (s) { segByKey.set(p.canonicalKey, s); for (const a of p.aliasKeys || []) segByKey.set(a, s); } }

  const processes = [];
  for (const role of axes) {
    // segments présents pour ce rôle (domaines clients) → on SÉPARE par domaine
    const roleParties = parties.filter(p => (p.roles || []).includes(role));
    const segCount = new Map();
    for (const p of roleParties) { const s = segByKey.get(p.canonicalKey); if (s) segCount.set(s, (segCount.get(s) || 0) + 1); }
    const bigSegs = [...segCount.entries()].filter(([, n]) => n >= 2).map(([s]) => s);

    // un processus par (rôle × segment) significatif — flux propre au niveau TYPE
    let madeSegmented = false;
    for (const seg of bigSegs) {
      const proc = await mineCrossProcess(workspaceId, { caseRole: role, segment: seg, creationOnly: true }).catch(() => null);
      if (!proc || proc.cases === 0 || proc.transitions.length === 0) continue;
      const base = await nameProcess({ roleLabel: roleLabel(role), segments: [seg], activities: proc.activities.map(a => a.activity), complete });
      // on suffixe par le SEGMENT pour distinguer les processus du même rôle par domaine
      const name = new RegExp(seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(base) ? base : `${base} — ${seg}`;
      processes.push({ key: `${role}:${seg}`, name, caseRole: role, segment: seg, ...proc });
      madeSegmented = true;
    }
    // + un processus global du rôle (toutes domaines confondus) pour la vue d'ensemble
    const all = await mineCrossProcess(workspaceId, { caseRole: role, creationOnly: true }).catch(() => null);
    if (all && all.cases > 0 && all.transitions.length > 0) {
      const segs = [...segCount.keys()];
      const name = await nameProcess({ roleLabel: roleLabel(role), segments: segs, activities: all.activities.map(a => a.activity), complete });
      processes.push({ key: role, name: madeSegmented ? `${name} — tous secteurs` : name, caseRole: role, segments: segs, ...all });
    }
  }
  processes.sort((a, b) => b.cases - a.cases);
  return { processes };
}

module.exports = { discoverProcesses, nameProcess };
