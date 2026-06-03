const { utils } = require('./utils');

module.exports = {
  async temporal_workflow_terminate(node, msg, inputs, opts) {
    return utils.run('temporal_workflow_terminate', inputs || {}, opts || {});
  }
};
