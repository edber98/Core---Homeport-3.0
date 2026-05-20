// Zoom API handler functions
// Category: meetings

const { utils } = require('./utils');

module.exports = {
  async zoom_meeting_delete(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('DELETE', '/meetings/{meetingId}', inputs, opts?.credentials, {
        pathParams: ["meetingId"]
      });
    }
};
