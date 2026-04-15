const TYPES = {
  research:             require('./research'),
  file_analyzer:        require('./file_analyzer'),
  doc_writer:           require('./doc_writer'),
  general:              require('./general'),
  memory_extractor:     require('./memory_extractor'),
  project_doc_writer:   require('./project_doc_writer'),
  // Nouvelle génération — Alan, René, Claude, Hedy, Graham, Marie, Florence,
  // Isaac, Kurt, Marvin (voir roster.js pour le mapping).
  code_runner:          require('./code_runner'),
  logician:             require('./logician'),
  security_auditor:     require('./security_auditor'),
  vision_analyst:       require('./vision_analyst'),
  voice_handler:        require('./voice_handler'),
  data_scientist:       require('./data_scientist'),
  dataviz:              require('./dataviz'),
  automation_architect: require('./automation_architect'),
  math_proof:           require('./math_proof'),
  expert_system:        require('./expert_system'),
};

function getSubagentType(name) {
  return TYPES[String(name || '').trim()] || null;
}

module.exports = { ...TYPES, getSubagentType };
