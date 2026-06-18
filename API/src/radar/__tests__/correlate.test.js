// Corrélation cross-logiciel par nom : un dossier Nextcloud / projet OpenProject
// nommé d'après un client est AUTOMATIQUEMENT relié à ce client. A (pur) + B (Mongo).

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { normalize, nameMatches, correlateByName } = require('../graph/correlate');

test('normalize : minuscule, sans accents, alphanumérique', () => {
  assert.equal(normalize('Cartonnage du Château'), 'cartonnage du chateau');
  assert.equal(normalize('ITBS / IT-BS'), 'itbs it bs');
});

test('nameMatches : détecte le nom du tiers dans un intitulé, évite les faux positifs', () => {
  assert.ok(nameMatches(normalize('Contrat Cartonnage du Château 2026'), normalize('Cartonnage du Château')));
  assert.ok(nameMatches(normalize('Projet Cartonnage du Château'), normalize('Cartonnage du Château')));
  assert.ok(!nameMatches(normalize('Facture EDF'), normalize('Cartonnage du Château')));
  assert.ok(!nameMatches(normalize('un texte'), normalize('abc'))); // nom trop court ignoré
});

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_correlate_test';
let mongoUp = true, RadarEntity, RadarRelation, wsId;

test.before(async () => {
  try { await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 }); await mongoose.connection.db.dropDatabase(); }
  catch { mongoUp = false; return; }
  RadarEntity = require('../../db/models/radar-entity.model');
  RadarRelation = require('../../db/models/radar-relation.model');
  wsId = new mongoose.Types.ObjectId();
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'email:c@chateau.fr', label: 'Cartonnage du Château', roles: ['client'] });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Asset', subtype: 'folder', canonicalKey: 'nextcloud:folder:/Clients/Cartonnage du Château', label: 'Cartonnage du Château' });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Document', subtype: 'file', canonicalKey: 'nextcloud:file:/Clients/Cartonnage du Château/Contrat.pdf', label: 'Contrat Cartonnage du Château 2026.pdf' });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Project', subtype: 'project', canonicalKey: 'openproject:project:op_1', label: 'Projet Cartonnage du Château' });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Document', subtype: 'file', canonicalKey: 'nextcloud:file:/Divers/note.txt', label: 'note interne' }); // ne matche personne
});

test.after(async () => { if (!mongoUp) return; await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); });

test('correlateByName : relie dossier/fichier/projet au client, ignore le reste', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const out = await correlateByName(wsId);
  assert.equal(out.matched, 3, 'dossier + fichier + projet reliés');
  assert.equal(out.created, 3);
  // le dossier pointe bien vers le client
  const rel = await RadarRelation.findOne({ workspaceId: wsId, fromKey: 'nextcloud:folder:/Clients/Cartonnage du Château', type: 'relates_to' }).lean();
  assert.ok(rel); assert.equal(rel.toKey, 'email:c@chateau.fr'); assert.equal(rel.role, 'client');
  // idempotent
  const out2 = await correlateByName(wsId);
  assert.equal(out2.created, 0, 'pas de doublon au 2e passage');
});
