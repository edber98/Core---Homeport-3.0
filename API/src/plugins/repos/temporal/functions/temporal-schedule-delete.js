const { utils } = require('./utils');

module.exports = {
  async temporal_schedule_delete(node, msg, inputs, opts) {
    return utils.run('temporal_schedule_delete', inputs || {}, opts || {});
  }
};
