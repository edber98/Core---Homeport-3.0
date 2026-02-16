// Zoom API handler functions
// Category: reports

const { utils } = require('./utils');

module.exports = {
  async zoom_dashboard_meetings(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return utils.zoomApi('GET', '/metrics/meetings', inputs, opts?.credentials, {
      queryParams: ["from", "to", "type"]
    });
  },

  async zoom_reports_meetings(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return utils.zoomApi('GET', '/report/users/{userId}/meetings', inputs, opts?.credentials, {
      pathParams: ["userId"],
      queryParams: ["from", "to"]
    });
  },

  async zoom_phone_users_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return utils.zoomApi('GET', '/phone/users', inputs, opts?.credentials, {
      queryParams: ["page_size", "status"]
    });
  }
};
