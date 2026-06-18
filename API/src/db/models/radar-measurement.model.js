const { Schema, model, Types } = require('mongoose');

// Mesure capteur / production (série temporelle). Volume élevé → on stocke des
// points (idéalement agrégés/downsamplés). Rattachée à un Asset (machine/capteur)
// du graphe. Un franchissement de seuil → Event + RadarSignal (filtre de
// significance temps-réel). Séparé du graphe pour ne pas le noyer.

const RadarMeasurementSchema = new Schema({
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  assetKey: { type: String, index: true },   // canonicalKey de l'Asset (machine/capteur) si connu
  metric: { type: String, required: true },   // temperature | vibration | oee | piece_count …
  value: { type: Number, required: true },
  unit: { type: String },
  at: { type: Date, required: true },
  source: { connectorId: { type: Types.ObjectId, ref: 'RadarConnector' }, providerKey: String },
}, { timestamps: true });

RadarMeasurementSchema.index({ workspaceId: 1, metric: 1, at: -1 });
RadarMeasurementSchema.index({ workspaceId: 1, assetKey: 1, metric: 1, at: -1 });

module.exports = model('RadarMeasurement', RadarMeasurementSchema);
