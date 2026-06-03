// Zoom API handler functions
// Category: reports

const { utils } = require('./utils');

module.exports = {
  async zoom_reports_meetings(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('GET', '/report/users/{userId}/meetings', inputs, opts?.credentials, {
        pathParams: ["userId"],
        queryParams: ["from", "to"]
      });
    }
};
