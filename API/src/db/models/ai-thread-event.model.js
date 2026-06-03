// AiThreadEvent — buffer circulaire (TTL 1h) des events SSE thread.
//
// Permet le replay au reconnect (Last-Event-ID). Sans ça, un client qui perd
// la connexion 5s manque tous les events émis pendant le délai → soit on force
// un reload complet, soit on a un état frontend désynchronisé.
//
// Avec replay :
//   1. Client se connecte avec Last-Event-ID: 1234
//   2. Backend fait `find({ threadId, seq: { $gt: 1234 } }).sort({ seq: 1 })`
//   3. Renvoie tous les events manqués puis bascule sur le live stream
//   4. Plus de polling, plus de refetch
//
// Le `seq` est monotone par thread (atomic $inc sur AiThread.eventSeq côté
// emit), garantit un ordre stable même sous concurrence multi-process (Mongo
// atomic).
//
// TTL 1h : suffit largement pour absorber une déconnexion. Au-delà, on accepte
// que le client doive faire un reload complet.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AiThreadEventSchema = new Schema(
  {
    threadId: { type: Schema.Types.ObjectId, required: true, index: true },
    seq: { type: Number, required: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: null },
    // jobId optionnel — utile pour les events liés à un sous-agent spécifique.
    jobId: { type: String, default: null, index: true },
    // TTL : Mongo va supprimer automatiquement les docs > 1h après createdAt.
    createdAt: { type: Date, default: Date.now, expires: 3600 },
  },
  { versionKey: false }
);

// Index compound pour replay efficace : find({ threadId, seq: { $gt } }).sort({ seq: 1 })
AiThreadEventSchema.index({ threadId: 1, seq: 1 });

module.exports = mongoose.model('AiThreadEvent', AiThreadEventSchema);
