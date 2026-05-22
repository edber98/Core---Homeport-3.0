const { utils } = require('./utils');

module.exports = {
  async temporal_workflow_query(node, msg, inputs, opts) {
    return utils.run('temporal_workflow_query', inputs || {}, opts || {});
  }
};
