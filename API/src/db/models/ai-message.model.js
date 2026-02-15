const { Schema, model, Types } = require('mongoose');

const ToolCallSchema = new Schema({
  id: { type: String },
  name: { type: String },
  args: { type: Schema.Types.Mixed },
  result: { type: Schema.Types.Mixed },
  duration: { type: Number },
  status: { type: String, enum: ['success', 'error', 'running'] },
}, { _id: false });

const QuestionItemSchema = new Schema({
  id: { type: String },
  text: { type: String },
  questionType: { type: String, enum: ['single', 'multi', 'text'] },
  options: [{ label: String, value: String, description: String }],
}, { _id: false });

const QuestionSchema = new Schema({
  text: { type: String },
  questionType: { type: String, enum: ['single', 'multi', 'text', 'batch'] },
  options: [{ label: String, value: String, description: String }],
  questions: { type: [QuestionItemSchema], default: undefined },
}, { _id: false });

const SegmentSchema = new Schema({
  type: { type: String, enum: ['text', 'tools'], required: true },
  content: { type: String },
  toolCalls: { type: [ToolCallSchema], default: undefined },
}, { _id: false });

const AiMessageSchema = new Schema({
  threadId: { type: Types.ObjectId, ref: 'AiThread', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
  content: { type: String, default: '' },
  toolCalls: { type: [ToolCallSchema], default: undefined },
  segments: { type: [SegmentSchema], default: undefined },
  question: { type: QuestionSchema, default: undefined },
  attachments: { type: [Schema.Types.Mixed], default: undefined },
  answer: { type: Schema.Types.Mixed, default: undefined },
  cancelled: { type: Boolean, default: undefined },
  usage: {
    input: { type: Number },
    output: { type: Number },
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = model('AiMessage', AiMessageSchema);
