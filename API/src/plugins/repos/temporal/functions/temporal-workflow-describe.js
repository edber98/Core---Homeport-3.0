const { utils } = require('./utils');

module.exports = {
  async temporal_workflow_describe(node, msg, inputs, opts) {
    return utils.run('temporal_workflow_describe', inputs || {}, opts || {});
  }
};
