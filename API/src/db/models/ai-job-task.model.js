const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const AiJobTaskSchema = new Schema({
  id: { type: String, unique: true, index: true, sparse: true },
  jobId: { type: String, required: true, index: true },
  threadId: { type: Types.ObjectId, ref: 'AiThread', index: true },
  subject: { type: String, default: '' },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'error', 'cancelled', 'blocked'],
    default: 'pending',
  },
  order: { type: Number, default: 0 },
  blockedBy: { type: [String], default: [] },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

AiJobTaskSchema.pre('save', function (next) {
  if (!this.id) this.id = newId('aijt');
  next();
});

module.exports = model('AiJobTask', AiJobTaskSchema);
