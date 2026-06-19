// Radar — FILE D'ATTENTE d'analyse documentaire (Étage 4, compréhension du contenu).
//
// La corrélation par nom de fichier (correlate.js) relie « Devis_PR2506-0001.pdf » à
// la pièce PR2506-0001. Mais beaucoup de fichiers n'ont PAS la réf dans leur nom
// (« scan001.pdf », « contrat signé.pdf », un mail avec PJ). Pour ceux-là, on
// TÉLÉCHARGE le document, on en LIT le texte, et on demande au LLM à quoi le relier
// (quelle pièce / quel client / quel projet) — predict-or-ask : on relie si sûr,
// sinon on met en revue. C'est une file : batch borné, ré-exécutable, idempotent.
//
// Déterministe pour la sélection ; LLM pour la compréhension du contenu.

const { llmCompleteJSON } = require('./llm');

/** Extrait du texte exploitable d'un buffer selon le format. @returns {Promise<string|null>} */
async function extractText(buf, path) {
  const p = String(path || '').toLowerCase();
  try {
    if (/\.(xlsx|xls|ods|csv)$/.test(p)) {                       // tableurs → CSV via lib xlsx
      const XLSX = require('xlsx');
      const wb = XLSX.read(buf, { type: 'buffer' });
      return wb.SheetNames.map(n => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join('\n').slice(0, 8000);
    }
    if (/\.(txt|md|csv|json|xml|html?|rtf)$/.test(p)) return buf.toString('utf8');
    if (/\.pdf$/.test(p)) {                                      // PDF → texte complet via pdf-parse v2 (classe PDFParse)
      try { const { PDFParse } = require('pdf-parse'); const r = await new PDFParse({ data: buf }).getText(); if (r && r.text && r.text.trim().length > 20) return r.text.slice(0, 8000); } catch {}
    }
    if (/\.docx$/.test(p)) {                                     // docx → texte du word/document.xml (sans dépendance)
      try { const t = unzipDocxText(buf); if (t && t.length > 20) return t.slice(0, 8000); } catch {}
    }
    // dernier recours : fragments ASCII lisibles (titres, refs) ; le LLM complète avec le nom.
    const ascii = buf.toString('latin1').replace(/[^\x20-\x7E\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return ascii.length > 40 ? ascii.slice(0, 2000) : null;
  } catch { return null; }
}

/** Extrait le texte d'un .docx (zip) sans dépendance : on lit word/document.xml. */
function unzipDocxText(buf) {
  const zlib = require('zlib');
  // recherche des entrées déflatées du zip (local file headers PK\x03\x04)
  let out = '';
  for (let i = 0; i + 30 < buf.length; i++) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x03 && buf[i + 3] === 0x04) {
      const method = buf.readUInt16LE(i + 8), nameLen = buf.readUInt16LE(i + 26), extraLen = buf.readUInt16LE(i + 28);
      const compSize = buf.readUInt32LE(i + 18);
      const name = buf.slice(i + 30, i + 30 + nameLen).toString('latin1');
      const start = i + 30 + nameLen + extraLen;
      if (/document\.xml$/.test(name) && compSize > 0) {
        try { const raw = method === 8 ? zlib.inflateRawSync(buf.slice(start, start + compSize)) : buf.slice(start, start + compSize);
          out = raw.toString('utf8').replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim(); break; } catch {}
      }
    }
  }
  return out;
}

/** Télécharge + extrait le contenu texte d'un fichier Nextcloud (best-effort). @returns {string|null} */
async function downloadText(path, { credentials } = {}) {
  if (!path || !credentials) return null;
  // nc_file_get ne renvoie pas le contenu (il le stocke via opts.files) → on appelle
  // directement WebDAV GET pour récupérer le base64 brut.
  let utils;
  try { ({ utils } = require('../plugins/repos/nextcloud/functions/utils')); } catch { return null; }
  const res = await utils.webdavRequest({ credentials }, path, { method: 'GET', rawResponse: true }).catch(() => null);
  if (!res || !res.ok || !res.data) return null;
  try { return await extractText(Buffer.from(res.data, 'base64'), path); } catch { return null; }
}

// Extensions « documents bureautiques » qu'on sait lire/relier (on ne scanne PAS les
// images, vidéos, binaires…). Configurable via opts.exts.
const DOC_EXTS = /\.(pdf|docx?|xlsx?|odt|ods|csv|txt|md|rtf|pptx?)$/i;

/**
 * Analyse un BATCH de documents non encore reliés et propose/applique un rattachement.
 * CONFIGURABLE et INCRÉMENTAL : on ne re-scanne pas ce qui l'a déjà été (metadata
 * `docAnalyzed`), on borne le batch, on cible un dossier, on filtre par type → on
 * ne traite jamais les 800 fichiers d'un coup.
 * @param opts.limit        taille du batch (défaut 25)
 * @param opts.pathPrefix   ne traiter que les fichiers sous ce chemin (ex. '/RadarDemo')
 * @param opts.exts         RegExp des extensions à lire (défaut bureautiques)
 * @param opts.skipAnalyzed sauter les fichiers déjà analysés (défaut true → incrémental)
 * @param opts.complete     fonction LLM JSON (défaut llmCompleteJSON)
 * @param opts.fetchText    (path) => Promise<string|null> — injection du téléchargement
 * @param opts.apply        applique les relations sûres + sauvegarde la metadata (défaut true)
 * @returns {{ scanned, queued, read, linked, review, results }}
 */
async function analyzeDocuments(workspaceId, { limit = 25, pathPrefix = null, exts = DOC_EXTS, skipAnalyzed = true, complete = llmCompleteJSON, fetchText, apply = true, minConfidence = 0.7 } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');

  // téléchargement par défaut via le connecteur Nextcloud + credential réel
  if (!fetchText) {
    try {
      const { registry } = require('../plugins/registry');
      const Credential = require('../db/models/credential.model');
      const { decrypt } = require('../utils/enc');
      const cred = await Credential.findOne({ providerKey: { $in: ['nextcloudFiles', 'nextcloud'] } }).lean();
      const credentials = cred ? decrypt(cred.secret) : null;
      fetchText = (p) => downloadText(p, { registry, credentials });
    } catch { fetchText = async () => null; }
  }

  // 1) sélection CONFIGURABLE : fichiers bureautiques, sous le chemin ciblé, sans lien
  //    métier `documents` encore établi, pas déjà analysés (incrémental). part_of (=
  //    appartenance au dossier) n'est PAS un lien métier → ne disqualifie pas.
  const q = { workspaceId, coreType: { $in: ['Document', 'Asset'] }, subtype: 'file' };
  if (pathPrefix) q['attributes.path'] = new RegExp('^' + pathPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (skipAnalyzed) q['attributes.docAnalyzed'] = { $ne: true };
  const files = await RadarEntity.find(q).select('canonicalKey label attributes').lean();
  const linkedDoc = new Set((await RadarRelation.find({ workspaceId, type: 'documents' }).select('fromKey').lean()).map(r => r.fromKey));
  const queue = files
    .filter(f => !linkedDoc.has(f.canonicalKey))
    .filter(f => exts.test(f.label || '') || exts.test(f.attributes?.path || ''))   // bureautiques seulement
    .slice(0, limit);

  // 2) contexte candidat : pièces (transactions) + projets + clients du workspace,
  //    avec leur réf → le LLM choisit la cible à partir du CONTENU lu.
  const txs = await RadarEntity.find({ workspaceId, coreType: 'Transaction' }).select('canonicalKey subtype label attributes').lean();
  const projects = await RadarEntity.find({ workspaceId, coreType: 'Project' }).select('canonicalKey label').lean();
  const parties = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'client' }).select('canonicalKey label').lean();
  const refOf = (t) => t.attributes?.ref || t.attributes?.number || t.label;
  const candidates = [
    ...txs.map(t => ({ key: t.canonicalKey, kind: t.subtype, ref: refOf(t), label: t.label })),
    ...projects.map(p => ({ key: p.canonicalKey, kind: 'project', ref: p.label, label: p.label })),
  ];
  const byKey = new Map(candidates.map(c => [c.key, c]));
  const clientList = parties.slice(0, 40).map(p => p.label).join(', ');

  const out = { scanned: files.length, queued: queue.length, read: 0, linked: 0, review: 0, results: [] };
  for (const f of queue) {
    let text = await fetchText(f.attributes?.path).catch(() => null);
    if (text) out.read++;
    const snippet = (text || '').replace(/\s+/g, ' ').trim().slice(0, 1500);

    // shortlist de candidats pour ne pas exploser le prompt : refs présentes dans le
    // chemin OU les 30 premières pièces. Le LLM tranche sur le contenu + le nom.
    const pathNorm = `${f.label || ''} ${f.attributes?.path || ''}`.toLowerCase();
    const shortlist = candidates.filter(c => c.ref && pathNorm.includes(String(c.ref).toLowerCase()));
    const pool = (shortlist.length ? shortlist : candidates).slice(0, 30);

    let verdict = null;
    if (typeof complete === 'function') {
      verdict = await complete(`Tu rattaches un document d'entreprise à la bonne pièce.
FICHIER : « ${f.label} »  (chemin : ${f.attributes?.path || 'n/a'})
CONTENU (extrait) : ${snippet || '(non lisible — juge sur le nom/chemin)'}
CLIENTS connus : ${clientList || 'n/a'}
PIÈCES candidates (key | type | réf) :
${pool.map(c => `${c.key} | ${c.kind} | ${c.ref}`).join('\n') || '(aucune)'}

À quelle pièce ce document se rapporte-t-il ? Réponds JSON :
{"targetKey":"<key exacte ou null>","docType":"devis|facture|commande|contrat|plan|autre","confidence":0..1,"reason":"…"}`,
        { maxTokens: 220 }).catch(() => null);
    }

    const target = verdict && verdict.targetKey && byKey.get(verdict.targetKey);
    const conf = verdict ? Number(verdict.confidence) || 0 : 0;
    const rec = { file: f.canonicalKey, label: f.label, read: !!text, docType: verdict?.docType || null, confidence: conf, target: target?.key || null, reason: verdict?.reason || null };

    if (target && conf >= minConfidence) {
      if (apply) {
        await RadarRelation.updateOne(
          { workspaceId, fromKey: f.canonicalKey, toKey: target.key, type: 'documents', role: target.kind },
          { $set: { confidence: conf, source: 'llm', evidence: { via: 'doc_content_analysis', docType: verdict.docType, reason: verdict.reason } } },
          { upsert: true }).catch(() => {});
        await RadarEntity.updateOne({ workspaceId, canonicalKey: f.canonicalKey },
          { $set: { 'attributes.docType': verdict.docType, 'attributes.docAnalyzed': true } }).catch(() => {});
      }
      out.linked++; rec.action = 'linked';
    } else {
      // predict-or-ask : doute → on garde une trace pour revue (pas de lien auto)
      if (apply) await RadarEntity.updateOne({ workspaceId, canonicalKey: f.canonicalKey },
        { $set: { 'attributes.docAnalyzed': true, 'attributes.reviewReason': verdict?.reason || 'cible incertaine' } }).catch(() => {});
      out.review++; rec.action = 'review';
    }
    out.results.push(rec);
  }
  return out;
}

module.exports = { analyzeDocuments, downloadText };
