const { Schema, model, Types } = require('mongoose');

const NotificationSchema = new Schema({
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  entityType: { type: String, enum: ['flow','workspace','template','app','credential'], required: true },
  entityId: { type: String, required: true },
  severity: { type: String, enum: ['info','warning','error','critical'], default: 'error' },
  code: { type: String, required: true },
  message: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  link: { type: String },
  acknowledged: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = model('Notification', NotificationSchema);

