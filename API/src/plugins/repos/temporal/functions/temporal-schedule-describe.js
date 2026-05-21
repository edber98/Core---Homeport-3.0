const { utils } = require('./utils');

module.exports = {
  async temporal_schedule_describe(node, msg, inputs, opts) {
    return utils.run('temporal_schedule_describe', inputs || {}, opts || {});
  }
};
