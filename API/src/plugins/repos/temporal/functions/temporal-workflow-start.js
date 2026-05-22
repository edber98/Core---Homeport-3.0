const { utils } = require('./utils');

module.exports = {
  async temporal_workflow_start(node, msg, inputs, opts) {
    return utils.run('temporal_workflow_start', inputs || {}, opts || {});
  }
};
