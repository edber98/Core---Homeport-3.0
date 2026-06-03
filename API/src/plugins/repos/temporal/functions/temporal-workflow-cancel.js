const { utils } = require('./utils');

module.exports = {
  async temporal_workflow_cancel(node, msg, inputs, opts) {
    return utils.run('temporal_workflow_cancel', inputs || {}, opts || {});
  }
};
