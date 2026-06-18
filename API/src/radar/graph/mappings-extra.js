// Mappings déclarés Nextcloud (fichiers) + OpenProject (projets) — pilotes.
// Comme pour Dolibarr : seeds optionnels ; tout autre logiciel passe par le
// mapping APPRIS. Ces entités se relient aux tiers par corrélation de nom
// (radar/graph/correlate.js) → graphe inter-logiciels.

const STORAGE_MAPPINGS = [
  // Dossier → Ressource/dossier (simulation)
  {
    providerKey: 'nextcloud', rawEntityType: 'folder',
    target: { coreType: 'Asset', subtype: 'folder' },
    keyField: 'path', labelField: 'name',
    fieldMap: { name: 'name', path: 'path', modifiedAt: 'mtime' },
  },
  // Fichier → Document/fichier (simulation)
  {
    providerKey: 'nextcloud', rawEntityType: 'file',
    target: { coreType: 'Document', subtype: 'file' },
    keyField: 'path', labelField: 'name',
    fieldMap: { name: 'name', path: 'path', mimeType: 'contentType', size: 'size', modifiedAt: 'mtime' },
  },
  // RÉEL : Nextcloud Files — fichier, rattaché à son DOSSIER parent (parcours récursif).
  {
    providerKey: 'nextcloudFiles', rawEntityType: 'file',
    target: { coreType: 'Document', subtype: 'file' },
    keyField: 'path', labelField: 'name',
    fieldMap: { name: 'name', path: 'path', mimeType: 'contentType', size: 'size', modifiedAt: 'lastModified' },
    // part_of → dossier parent (résolu via aliasKey nextcloudFiles:folder:{parentPath})
    relationRules: [{ type: 'part_of', viaField: 'parentPath', targetKey: 'nextcloudFiles:folder:{value}', targetCoreType: 'Asset', targetSubtype: 'folder' }],
  },
  // RÉEL : Nextcloud Files — dossier, rattaché à son dossier parent (hiérarchie).
  {
    providerKey: 'nextcloudFiles', rawEntityType: 'folder',
    target: { coreType: 'Asset', subtype: 'folder' },
    keyField: 'path', labelField: 'name',
    fieldMap: { name: 'name', path: 'path', modifiedAt: 'lastModified' },
    relationRules: [{ type: 'part_of', viaField: 'parentPath', targetKey: 'nextcloudFiles:folder:{value}', targetCoreType: 'Asset', targetSubtype: 'folder' }],
  },
];

const OPENPROJECT_MAPPINGS = [
  // Projet → Projet/projet
  {
    providerKey: 'openproject', rawEntityType: 'project',
    target: { coreType: 'Project', subtype: 'project' },
    keyField: 'id', labelField: 'name',
    fieldMap: { title: 'name', status: 'status', startDate: 'createdAt' },
  },
  // Work package → Travail/tâche, rattaché au projet (champ réel : 'project')
  {
    providerKey: 'openproject', rawEntityType: 'work_package',
    target: { coreType: 'WorkItem', subtype: 'task' },
    keyField: 'id', labelField: 'subject',
    fieldMap: { title: 'subject', status: 'status', priority: 'priority', dueDate: 'dueDate', assignee: 'assignee' },
    relationRules: [{ type: 'part_of', viaField: 'project', targetRawType: 'project', targetCoreType: 'Project', targetSubtype: 'project' }],
  },
];

async function seedExtraMappings() {
  const RadarMapping = require('../../db/models/radar-mapping.model');
  const all = [...STORAGE_MAPPINGS, ...OPENPROJECT_MAPPINGS];
  for (const m of all) {
    await RadarMapping.updateOne(
      { providerKey: m.providerKey, rawEntityType: m.rawEntityType, workspaceId: null },
      { $set: { ...m, workspaceId: null, learnedBy: 'manual', status: 'active' } },
      { upsert: true }
    );
  }
  return all.length;
}

module.exports = { STORAGE_MAPPINGS, OPENPROJECT_MAPPINGS, seedExtraMappings };
