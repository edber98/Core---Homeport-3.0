const { Schema, model } = require('mongoose');

const CompanySchema = new Schema({
  name: { type: String, required: true, index: true },
}, { timestamps: true });

module.exports = model('Company', CompanySchema);

