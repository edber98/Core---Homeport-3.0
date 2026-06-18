// Mapping email déclaré (Communication/email) — vaut pour Gmail / IMAP / Outlook.
// L'expéditeur est relié à une Party par son adresse (email:<addr>), ce qui CONNECTE
// les emails aux tiers déjà connus (ex. un mail d'un client Dolibarr pointe sur la
// même entité). C'est la mémoire cross-source en action.

const EMAIL_MAPPINGS = [
  {
    providerKey: 'gmail', rawEntityType: 'email',
    target: { coreType: 'Communication', subtype: 'email' },
    keyField: 'id', labelField: 'subject',
    fieldMap: { from: 'fromEmail', fromName: 'fromName', to: 'to', subject: 'subject', snippet: 'snippet', sentAt: 'date' },
    relationRules: [
      // expéditeur → Party (clé canonique email:<addr>, donc dédup avec les tiers)
      { type: 'party_of', role: 'author', viaField: 'fromEmail', targetKey: 'email:{value}', targetCoreType: 'Party', targetSubtype: 'person' },
    ],
  },
];

/** Upsert idempotent des mappings email (globaux). */
async function seedEmailMappings() {
  const RadarMapping = require('../../db/models/radar-mapping.model');
  let n = 0;
  for (const m of EMAIL_MAPPINGS) {
    await RadarMapping.updateOne(
      { providerKey: m.providerKey, rawEntityType: m.rawEntityType, workspaceId: null },
      { $set: { ...m, workspaceId: null, learnedBy: 'manual', status: 'active' } },
      { upsert: true }
    );
    n++;
  }
  return n;
}

module.exports = { EMAIL_MAPPINGS, seedEmailMappings };
