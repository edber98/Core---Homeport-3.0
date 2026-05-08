// Registre global des listeners HTTP trigger actifs, indexé par triggerId.
//
// Sert à 2 cas :
//   1. Production : trigger-manager.deployFlow → HttpTriggerAdapter.start()
//      enregistre l'adapter ici. Reste tant que le flow est déployé.
//   2. Test/dev : waitForOneEvent crée un adapter temporaire qui s'enregistre
//      ici, attend 1 event, puis se désinscrit.
//
// L'URL `/api/trigger/:triggerId` lookup ce registre — peu importe le mode,
// l'utilisateur a UNE seule URL stable qui marche dans les deux cas.

const listeners = new Map();

function register(triggerId, adapter) {
  if (!triggerId) return;
  listeners.set(String(triggerId), adapter);
}

function unregister(triggerId) {
  if (!triggerId) return;
  listeners.delete(String(triggerId));
}

function getListener(triggerId) {
  if (!triggerId) return null;
  return listeners.get(String(triggerId)) || null;
}

function listAll() {
  return Array.from(listeners.entries()).map(([id, adp]) => ({
    triggerId: id,
    type: adp.triggerType || 'http',
    flowId: adp.flow?._id ? String(adp.flow._id) : null,
    nodeId: adp.eventNode?.id || null,
  }));
}

module.exports = { register, unregister, getListener, listAll };
