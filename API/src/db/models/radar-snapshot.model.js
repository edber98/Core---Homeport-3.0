const { Schema, model, Types } = require('mongoose');

// Snapshot Radar — une ligne par entité observée chez un provider.
// La baseline (1er passage) écrit les snapshots sans émettre de deltas ;
// les passages suivants comparent contentHash pour produire les RadarDelta.

const RadarSnapshotSchema = new Schema({
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  connectorId: { type: Types.ObjectId, ref: 'RadarConnector', required: true, index: true },
  family: { type: String, required: true },
  entityType: { type: String, required: true },   // ex: 'supplier_invoice', 'email_message', 'file'
  entityKey: { type: String, required: true },    // id stable côté provider
  contentHash: { type: String, required: true },  // hash des hashFields (ou de l'entité entière)
  data: { type: Schema.Types.Mixed },             // payload normalisé compact
  firstSeenAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
  lastChangedAt: { type: Date },
  deletedAt: { type: Date },                      // soft-delete si disparu du provider
}, { timestamps: true });

RadarSnapshotSchema.index({ connectorId: 1, entityType: 1, entityKey: 1 }, { unique: true });

module.exports = model('RadarSnapshot', RadarSnapshotSchema);
