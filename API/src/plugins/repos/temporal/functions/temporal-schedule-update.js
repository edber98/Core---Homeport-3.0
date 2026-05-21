const { utils } = require('./utils');

module.exports = {
  async temporal_schedule_update(node, msg, inputs, opts) {
    return utils.run('temporal_schedule_update', inputs || {}, opts || {});
  }
};
