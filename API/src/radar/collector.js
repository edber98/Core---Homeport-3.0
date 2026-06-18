// Radar — collecteur générique.
//
// Exécute les specs `watch` du bloc radar d'un connecteur (via le
// capability-registry), normalise les entités (entityKey + contentHash),
// puis :
//   - 1er passage (baseline) : écrit les snapshots, n'émet AUCUN delta —
//     c'est la « première boucle d'informations » qui découvre le terrain ;
//   - passages suivants : diff par hash → RadarDelta created / updated /
//     deleted (suppression détectée seulement si la spec watch l'autorise,
//     car une liste fenêtrée/limitée ne prouve pas une disparition).
//
// Aucun LLM ici : l'observation est déterministe et gratuite.

const { checksumJSON, stableStringify } = require('../utils/checksum');
const { newId } = require('../utils/ids');
const { listWatchSpecs, execCapability } = require('./capability-registry');

/** Extrait le tableau d'entités du résultat d'un handler. Pure. */
function extractItems(result, watchSpec = {}) {
  if (!result || typeof result !== 'object') return [];
  if (watchSpec.itemsField) {
    const v = result[watchSpec.itemsField];
    return Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : [];
  }
  // Convention handlers : { ok: true, files: [...] } / { ok, invoices: [...] } —
  // on prend le premier tableau d'objets trouvé au premier niveau.
  for (const v of Object.values(result)) {
    if (Array.isArray(v) && v.length && v.every(x => x && typeof x === 'object')) return v;
    if (Array.isArray(v) && !v.length) return v;
  }
  return [];
}

/**
 * Une entité matche-t-elle une règle d'exclusion de la spec watch ? Pure.
 * excludeWhen: [{ field, equals?, in?: [], empty?: true }] — OR entre règles.
 * Ex. Nextcloud : les dossiers n'ont pas de contentType → { field: 'contentType', empty: true }.
 */
function matchesExclude(item, excludeWhen) {
  if (!Array.isArray(excludeWhen) || !excludeWhen.length) return false;
  return excludeWhen.some(rule => {
    if (!rule || !rule.field) return false;
    const v = item[rule.field];
    if (rule.empty === true) return v === undefined || v === null || v === '';
    if (Array.isArray(rule.in)) return rule.in.includes(v);
    if (rule.equals !== undefined) return v === rule.equals;
    return false;
  });
}

/** Normalise une entité : clé stable + hash de contenu. Pure. Retourne null si la clé manque. */
function normalizeEntity(item, watchSpec) {
  const raw = item && item[watchSpec.key];
  if (raw === undefined || raw === null || raw === '') return null;
  const hashSource = Array.isArray(watchSpec.hashFields) && watchSpec.hashFields.length
    ? Object.fromEntries(watchSpec.hashFields.map(f => [f, item[f]]))
    : item;
  return { entityKey: String(raw), contentHash: checksumJSON(hashSource), data: item };
}

/** Champs hashFields dont la valeur a changé entre deux états. Pure. */
function diffChangedFields(before, after, hashFields) {
  if (!Array.isArray(hashFields) || !hashFields.length) return undefined;
  return hashFields.filter(f => stableStringify(before ? before[f] : undefined) !== stableStringify(after ? after[f] : undefined));
}

/**
 * Collecte un connecteur : toutes ses specs watch, snapshots + deltas.
 * @param {object} connector - doc RadarConnector hydraté (sera sauvegardé)
 * @param {object} [opts]
 * @param {Date} [opts.now]
 * @param {function} [opts.log]
 * @returns {Promise<{ ok: boolean, baseline: boolean, deltas: number, perWatch: Array, errors: string[] }>}
 */
async function collectConnector(connector, { now = new Date(), log = () => {} } = {}) {
  const RadarSnapshot = require('../db/models/radar-snapshot.model');
  const RadarDelta = require('../db/models/radar-delta.model');
  const Provider = require('../db/models/provider.model');

  const provider = await Provider.findOne({ key: connector.providerKey }).select('key radar').lean();
  const summary = { ok: true, baseline: !connector.baselineDoneAt, deltas: 0, perWatch: [], errors: [] };
  if (!provider) {
    summary.ok = false;
    summary.errors.push(`provider_not_found: ${connector.providerKey}`);
    await _updateHealth(connector, summary, now);
    return summary;
  }

  const watchSpecs = listWatchSpecs({ providerRadar: provider.radar, family: connector.family });
  if (!watchSpecs.length) {
    // Pas de specs watch = connecteur utilisable par les missions mais sans
    // observation continue — no-op sain (pas une erreur, pas de backoff).
    summary.noWatch = true;
    await _updateHealth(connector, summary, now);
    return summary;
  }

  const isBaseline = summary.baseline;
  const deltasToInsert = [];

  // Cache par run : plusieurs watch peuvent partager une même capacité (ex. Nextcloud
  // fichiers + dossiers via le même parcours récursif `listTree`) → on ne crawle qu'une fois.
  const capCache = new Map();
  const execCached = async (capability, args) => {
    const ck = `${capability}::${JSON.stringify(args || {})}`;
    if (capCache.has(ck)) return capCache.get(ck);
    const r = await execCapability({ connector, capability, args: args || {}, log });
    capCache.set(ck, r);
    return r;
  };

  for (const spec of watchSpecs) {
    const w = { entityType: spec.entity, seen: 0, skippedNoKey: 0, created: 0, updated: 0, deleted: 0, error: null };
    summary.perWatch.push(w);

    const exec = await execCached(spec.via, spec.args || {});
    if (!exec.ok) {
      w.error = exec.error;
      summary.errors.push(`${spec.entity}: ${exec.error}`);
      continue;
    }

    const entities = [];
    const seenKeys = new Set();
    for (const item of extractItems(exec.result, spec)) {
      if (matchesExclude(item, spec.excludeWhen)) { w.excluded = (w.excluded || 0) + 1; continue; }
      const e = normalizeEntity(item, spec);
      if (!e) { w.skippedNoKey++; continue; }
      if (seenKeys.has(e.entityKey)) continue; // doublon dans la même réponse
      seenKeys.add(e.entityKey);
      entities.push(e);
    }
    w.seen = entities.length;

    const existing = await RadarSnapshot.find({ connectorId: connector._id, entityType: spec.entity })
      .select('entityKey contentHash data deletedAt').lean();
    const byKey = new Map(existing.map(s => [s.entityKey, s]));

    const bulk = [];
    for (const e of entities) {
      const prev = byKey.get(e.entityKey);
      if (!prev) {
        bulk.push({ insertOne: { document: {
          workspaceId: connector.workspaceId, connectorId: connector._id, family: connector.family,
          entityType: spec.entity, entityKey: e.entityKey, contentHash: e.contentHash, data: e.data,
          firstSeenAt: now, lastSeenAt: now,
        } } });
        if (!isBaseline) {
          w.created++;
          deltasToInsert.push(_delta(connector, spec.entity, e.entityKey, 'created', { after: e.data }, now));
        }
      } else if (prev.contentHash !== e.contentHash) {
        bulk.push({ updateOne: {
          filter: { connectorId: connector._id, entityType: spec.entity, entityKey: e.entityKey },
          update: { $set: { contentHash: e.contentHash, data: e.data, lastSeenAt: now, lastChangedAt: now, deletedAt: null } },
        } });
        if (!isBaseline) {
          w.updated++;
          deltasToInsert.push(_delta(connector, spec.entity, e.entityKey, 'updated', {
            before: prev.data, after: e.data,
            changedFields: diffChangedFields(prev.data, e.data, spec.hashFields),
          }, now));
        }
      } else {
        // Inchangé — entité revenue après soft-delete = réapparition
        const update = { lastSeenAt: now };
        if (prev.deletedAt) {
          update.deletedAt = null;
          if (!isBaseline) {
            w.created++;
            deltasToInsert.push(_delta(connector, spec.entity, e.entityKey, 'created', { after: e.data }, now));
          }
        }
        bulk.push({ updateOne: {
          filter: { connectorId: connector._id, entityType: spec.entity, entityKey: e.entityKey },
          update: { $set: update },
        } });
      }
    }

    // Suppressions : uniquement si la spec garantit une liste exhaustive
    if (spec.detectDeletions === true && !isBaseline) {
      for (const prev of existing) {
        if (prev.deletedAt || seenKeys.has(prev.entityKey)) continue;
        bulk.push({ updateOne: {
          filter: { connectorId: connector._id, entityType: spec.entity, entityKey: prev.entityKey },
          update: { $set: { deletedAt: now } },
        } });
        w.deleted++;
        deltasToInsert.push(_delta(connector, spec.entity, prev.entityKey, 'deleted', { before: prev.data }, now));
      }
    }

    if (bulk.length) await RadarSnapshot.bulkWrite(bulk, { ordered: false });
  }

  if (deltasToInsert.length) {
    await RadarDelta.insertMany(deltasToInsert, { ordered: false });
    summary.deltas = deltasToInsert.length;
  }

  // Échec total (toutes les specs en erreur) → connecteur en erreur ; partiel → ok
  summary.ok = summary.perWatch.some(w => !w.error);
  if (summary.ok && !connector.baselineDoneAt) connector.baselineDoneAt = now;
  await _updateHealth(connector, summary, now);
  log(`[radar-collector] ${connector.providerKey}/${connector.family} baseline=${isBaseline} deltas=${summary.deltas}`);
  return summary;
}

function _delta(connector, entityType, entityKey, type, fields, now) {
  return {
    id: newId('rdel'),
    workspaceId: connector.workspaceId, connectorId: connector._id, family: connector.family,
    entityType, entityKey, type, status: 'pending', occurredAt: now,
    ...fields,
  };
}

async function _updateHealth(connector, summary, now) {
  connector.lastPollAt = now;
  connector.health = connector.health || {};
  if (summary.ok) {
    connector.status = 'active';
    connector.lastError = summary.errors.length ? summary.errors.join(' | ') : undefined;
    connector.health.consecutiveErrors = 0;
  } else {
    connector.status = 'error';
    connector.lastError = summary.errors.join(' | ') || 'collect_failed';
    connector.health.consecutiveErrors = (connector.health.consecutiveErrors || 0) + 1;
  }
  await connector.save();
  // Temps réel : statut/collecte du connecteur visible immédiatement dans l'UI
  require('./events').emitRadarEvent(connector.workspaceId, 'connector.updated', {
    connectorId: connector.id, family: connector.family, providerKey: connector.providerKey,
    status: connector.status, lastPollAt: connector.lastPollAt,
    deltas: summary.deltas || 0, baseline: !!summary.baseline, lastError: connector.lastError || undefined,
  });
}

module.exports = { collectConnector, extractItems, normalizeEntity, diffChangedFields, matchesExclude };
