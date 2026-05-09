// Registry des resolvers de form-fields type "resolver".
//
// Un resolver est un module JS qui sait :
//   - resolve({ flow, node, variant, baseUrl, user }) → { variants: [{id,label,value}], current, lastResolvedAt }
//   - runAction({ flow, node, action, user }) → { ... } (effet de bord, ex: rotate token)
//
// Le manifest d'un nodeTemplate déclare un field type "resolver" avec un nom
// pointant ici. Pour ajouter un resolver : créer un fichier dans ce dossier,
// l'enregistrer dans REGISTRY ci-dessous. Aucun changement framework requis.

const REGISTRY = {
  core_webhook_url:           require('./core-webhook-url'),
  core_webhook_token:         require('./core-webhook-token'),
  core_webhook_password:      require('./core-webhook-password'),
  core_webhook_hmac_secret:   require('./core-webhook-hmac-secret'),
};

function getResolver(name) {
  return REGISTRY[name] || null;
}

function listResolvers() {
  return Object.keys(REGISTRY);
}

module.exports = { getResolver, listResolvers };
