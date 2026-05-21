const { utils } = require('./utils');

module.exports = {
  async temporal_schedule_trigger(node, msg, inputs, opts) {
    return utils.run('temporal_schedule_trigger', inputs || {}, opts || {});
  }
};
