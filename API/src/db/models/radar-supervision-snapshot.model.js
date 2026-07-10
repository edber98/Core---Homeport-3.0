const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Snapshot de SUPERVISION (R4 — supervision continue). Une ligne = un instantané
// horodaté des KPI clés du workspace, capturé périodiquement par superviseSnapshot.
// On le compare au PRÉCÉDENT instantané pour détecter les changements significatifs
// (nouvelle facture en retard, marge qui baisse, nouveau client mécontent…).
// Distinct de RadarSnapshot (qui photographie chaque ENTITÉ d'un provider) : ici on
// photographie l'ÉTAT GLOBAL synthétique du workspace à un instant t.

const RadarSupervisionSnapshotSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  at: { type: Date, required: true },
  kpis: { type: Schema.Types.Mixed, default: {} },   // { caFacture, encaisse, impaye, marginRate, ... }
}, { timestamps: true });

RadarSupervisionSnapshotSchema.index({ workspaceId: 1, at: -1 });
RadarSupervisionSnapshotSchema.pre('save', function(next){ if (!this.id) this.id = newId('rsup'); next(); });

module.exports = model('RadarSupervisionSnapshot', RadarSupervisionSnapshotSchema);
