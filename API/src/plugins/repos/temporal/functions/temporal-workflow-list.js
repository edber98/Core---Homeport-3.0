const { utils } = require('./utils');

module.exports = {
  async temporal_workflow_list(node, msg, inputs, opts) {
    return utils.run('temporal_workflow_list', inputs || {}, opts || {});
  }
};
