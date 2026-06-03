// Zoom API handler functions
// Category: meetings

const { utils } = require('./utils');

module.exports = {
  async zoom_meeting_update(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('PATCH', '/meetings/{meetingId}', inputs, opts?.credentials, {
        pathParams: ["meetingId"],
        bodyParams: ["topic", "start_time", "duration", "agenda"]
      });
    }
};
