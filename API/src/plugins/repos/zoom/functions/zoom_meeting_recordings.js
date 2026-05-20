// Zoom API handler functions
// Category: recordings

const { utils } = require('./utils');

module.exports = {
  async zoom_meeting_recordings(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('GET', '/meetings/{meetingId}/recordings', inputs, opts?.credentials, {
        pathParams: ["meetingId"]
      });
    }
};
