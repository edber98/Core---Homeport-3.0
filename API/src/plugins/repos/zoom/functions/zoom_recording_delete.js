// Zoom API handler functions
// Category: recordings

const { utils } = require('./utils');

module.exports = {
  async zoom_recording_delete(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('DELETE', '/meetings/{meetingId}/recordings', inputs, opts?.credentials, {
        pathParams: ["meetingId"]
      });
    }
};
