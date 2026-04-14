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
}, { _id: true });

const AiProjectKnowledgeSchema = new Schema({
  threadId: { type: Types.ObjectId, ref: 'AiThread', required: true, unique: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  entries: { type: [EntrySchema], default: [] },
}, { timestamps: true });

module.exports = model('AiProjectKnowledge', AiProjectKnowledgeSchema);
