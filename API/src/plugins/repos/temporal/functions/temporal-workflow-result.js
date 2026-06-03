const { utils } = require('./utils');

module.exports = {
  async temporal_workflow_result(node, msg, inputs, opts) {
    return utils.run('temporal_workflow_result', inputs || {}, opts || {});
  }
};
