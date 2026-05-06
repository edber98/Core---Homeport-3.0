// AiProjectKnowledge — structured key/value knowledge base scoped to an AiThread.
//
// Orientée « entreprise » : le user pré-remplit manuellement des infos projet
// (nom client, référent, dates, budget, URL, identifiants…) qui sont ensuite
// auto-injectées dans le contexte de l'agent (mode=project principalement).
//
// Format typé (text, number, date, url, email, file, list, boolean, json) pour
// permettre à l'UI de rendre chaque entrée correctement et à l'agent de
// raisonner sur la sémantique.
const { Schema, model, Types } = require('mongoose');

const EntrySchema = new Schema({
  key: { type: String, required: true, trim: true, maxlength: 100 },
  value: { type: Schema.Types.Mixed },
  type: {
    type: String,
    enum: ['text', 'number', 'date', 'url', 'email', 'file', 'list', 'boolean', 'json'],
    default: 'text',
  },
  description: { type: String, maxlength: 500 },
  source: { type: String, enum: ['manual', 'extracted', 'ai'], default: 'manual' },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: Types.ObjectId, ref: 'User' },
  pinned: { type: Boolean, default: false },
  tags: [{ type: String, maxlength: 40 }],
  // ── Auto-detection workflow (pending → approved/rejected) ──
  // Entries created manually OU via set_project_knowledge restent 'approved' (rétrocompat).
  // Le subagent memory_extractor crée des entries 'pending' en attente de validation.
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  // Contexte justifiant la suggestion auto (extrait de conversation)
  suggestionWhy: { type: String, maxlength: 500 },
  // Trace de l'origine (pour pouvoir re-contextualiser plus tard)
  sourceMessageId: { type: Types.ObjectId, ref: 'AiMessage' },
  reviewedAt: { type: Date },
  reviewedBy: { type: Types.ObjectId, ref: 'User' },
}, { _id: true });

const AiProjectKnowledgeSchema = new Schema({
  threadId: { type: Types.ObjectId, ref: 'AiThread', required: true, unique: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  entries: { type: [EntrySchema], default: [] },
}, { timestamps: true });

module.exports = model('AiProjectKnowledge', AiProjectKnowledgeSchema);
