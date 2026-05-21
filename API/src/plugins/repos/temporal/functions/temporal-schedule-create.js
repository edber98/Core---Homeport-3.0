const { utils } = require('./utils');

module.exports = {
  async temporal_schedule_create(node, msg, inputs, opts) {
    return utils.run('temporal_schedule_create', inputs || {}, opts || {});
  }
};
