const { utils } = require('./utils');

module.exports = {
  async temporal_schedule_list(node, msg, inputs, opts) {
    return utils.run('temporal_schedule_list', inputs || {}, opts || {});
  }
};
