const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Mission Radar — tâche auto-promptée par le superviseur, exécutée en fond
// sur le harness IA, avec critique contre successCriteria et retry.

const AttemptSchema = new Schema({
  attempt: { type: Number },
  result: { type: String },
  critiqueMet: { type: Boolean },
  critique: { type: String },
  at: { type: Date },
}, { _id: false });

const RadarMissionSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  title: { type: String, required: true },
  prompt: { type: String, required: true },          // écrit librement par le superviseur
  successCriteria: { type: [String], default: [] },  // critères vérifiés par l'agent critique
  maxAttempts: { type: Number, default: 2 },
  attempts: { type: Number, default: 0 },
  status: { type: String, enum: ['queued', 'running', 'done', 'failed'], default: 'queued', index: true },
  result: { type: String },                          // résultat final (texte de l'agent)
  lastCritique: { type: String },
  history: { type: [AttemptSchema], default: [] },
  signalIds: { type: [String], default: [] },        // RadarSignal.id à l'origine
  // Trace d'exécution (tracking frontend) : outils appelés par l'agent
  // [{ at, attempt, name, args, status, duration }] — plafonnée aux 100 derniers
  trace: { type: [Schema.Types.Mixed], default: [] },
  error: { type: String },
  startedAt: { type: Date },
  finishedAt: { type: Date },
}, { timestamps: true });

RadarMissionSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
RadarMissionSchema.pre('save', function(next){ if (!this.id) this.id = newId('rmis'); next(); });

module.exports = model('RadarMission', RadarMissionSchema);
