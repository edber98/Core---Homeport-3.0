// Zoom API handler functions
// Category: meetings

const { utils } = require('./utils');

module.exports = {
  async zoom_meeting_registrants_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('GET', '/meetings/{meetingId}/registrants', inputs, opts?.credentials, {
        pathParams: ["meetingId"]
      });
    }
};
