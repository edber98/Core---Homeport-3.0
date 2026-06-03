// Zoom API handler functions
// Category: reports

const { utils } = require('./utils');

module.exports = {
  async zoom_dashboard_meetings(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('GET', '/metrics/meetings', inputs, opts?.credentials, {
        queryParams: ["from", "to", "type"]
      });
    }
};
