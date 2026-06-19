const { Schema, model, Types } = require('mongoose');

// Index documentaire (RAG). Pour chaque fichier lu, on stocke le texte extrait + un
// vecteur de fréquences de termes (TF). La recherche fait un TF-IDF cosinus en mémoire
// (zéro infra). À l'échelle, on remplacera le scorer par des embeddings + un store
// vectoriel (ChromaDB/pgvector) sans changer l'API searchDocs().

const RadarDocChunkSchema = new Schema({
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  entityKey: { type: String, required: true },   // canonicalKey du fichier (Document)
  label: { type: String },
  path: { type: String },
  text: { type: String },                        // texte extrait (tronqué)
  tf: { type: Map, of: Number },                 // terme → fréquence (pour TF-IDF)
  nTokens: { type: Number, default: 0 },
}, { timestamps: true });

RadarDocChunkSchema.index({ workspaceId: 1, entityKey: 1 }, { unique: true });

module.exports = model('RadarDocChunk', RadarDocChunkSchema);
