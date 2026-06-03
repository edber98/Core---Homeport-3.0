const { utils } = require('./utils');

module.exports = {
  async kafka_offset_commit_group_offsets(node, msg, inputs, opts) {
    return utils.run('kafka_offset_commit_group_offsets', inputs || {}, opts || {});
  }
};
