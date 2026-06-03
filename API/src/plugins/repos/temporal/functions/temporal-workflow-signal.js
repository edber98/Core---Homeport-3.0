const { utils } = require('./utils');

module.exports = {
  async temporal_workflow_signal(node, msg, inputs, opts) {
    return utils.run('temporal_workflow_signal', inputs || {}, opts || {});
  }
};
