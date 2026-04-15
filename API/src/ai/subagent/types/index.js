const TYPES = {
  research:           require('./research'),
  file_analyzer:      require('./file_analyzer'),
  doc_writer:         require('./doc_writer'),
  general:            require('./general'),
  memory_extractor:   require('./memory_extractor'),
  project_doc_writer: require('./project_doc_writer'),
};

function getSubagentType(name) {
  return TYPES[String(name || '').trim()] || null;
}

module.exports = { ...TYPES, getSubagentType };
