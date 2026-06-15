const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Playbook Radar — procédure apprise (« pro system ») : comment l'entreprise
// veut que tel type de situation soit géré. En langage naturel, éditable par
// l'utilisateur, injecté dans le briefing du superviseur quand la catégorie
// du signal correspond.

const RadarPlaybookSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  name: { type: String, required: true },          // ex: "Client mécontent"
  // Catégories de signaux qui déclenchent ce playbook (ex: client_complaint)
  triggerCategories: { type: [String], default: [] },
  triggerDescription: { type: String, default: '' }, // en NL, pour les cas hors catégories
  procedure: { type: String, required: true },     // étapes en langage naturel
  autonomy: { type: String, enum: ['propose', 'auto_with_report', 'full_auto'], default: 'propose' },
  source: { type: String, enum: ['user_taught', 'learned_from_corrections', 'suggested_by_radar'], default: 'user_taught' },
  enabled: { type: Boolean, default: true },
  // Suggestion du radar en attente de confirmation utilisateur
  pendingApproval: { type: Boolean, default: false },
  stats: {
    timesUsed: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    overrideCount: { type: Number, default: 0 },
  },
}, { timestamps: true });

RadarPlaybookSchema.index({ workspaceId: 1, enabled: 1 });
RadarPlaybookSchema.pre('save', function(next){ if (!this.id) this.id = newId('rpbk'); next(); });

module.exports = model('RadarPlaybook', RadarPlaybookSchema);
