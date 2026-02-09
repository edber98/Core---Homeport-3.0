// Zoom API handler functions
// Category: recordings

const { utils } = require('./utils');

module.exports = {
  async zoom_recordings_list(node, msg, inputs, opts) {
    return utils.zoomApi('GET', '/users/{userId}/recordings', inputs, opts?.credentials, {
      pathParams: ["userId"],
      queryParams: ["from", "to", "page_size"]
    });
  },

  async zoom_meeting_recordings(node, msg, inputs, opts) {
    return utils.zoomApi('GET', '/meetings/{meetingId}/recordings', inputs, opts?.credentials, {
      pathParams: ["meetingId"]
    });
  },

  async zoom_recording_delete(node, msg, inputs, opts) {
    return utils.zoomApi('DELETE', '/meetings/{meetingId}/recordings', inputs, opts?.credentials, {
      pathParams: ["meetingId"]
    });
  },

  async zoom_recording_get_settings(node, msg, inputs, opts) {
    return utils.zoomApi('GET', '/meetings/{meetingId}/recordings/settings', inputs, opts?.credentials, {
      pathParams: ["meetingId"]
    });
  }
};
