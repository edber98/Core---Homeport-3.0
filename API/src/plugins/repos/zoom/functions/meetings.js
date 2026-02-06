// Zoom API handler functions
// Category: meetings

const { utils } = require('./utils');

module.exports = {
  async zoom_meeting_create(node, msg, inputs, opts) {
    return utils.zoomApi('POST', '/users/{userId}/meetings', inputs, opts?.credentials, {
      pathParams: ["userId"],
      bodyParams: ["topic", "type", "start_time", "duration", "timezone", "agenda", "password"]
    });
  },

  async zoom_meeting_get(node, msg, inputs, opts) {
    return utils.zoomApi('GET', '/meetings/{meetingId}', inputs, opts?.credentials, {
      pathParams: ["meetingId"]
    });
  },

  async zoom_meeting_update(node, msg, inputs, opts) {
    return utils.zoomApi('PATCH', '/meetings/{meetingId}', inputs, opts?.credentials, {
      pathParams: ["meetingId"],
      bodyParams: ["topic", "start_time", "duration", "agenda"]
    });
  },

  async zoom_meeting_delete(node, msg, inputs, opts) {
    return utils.zoomApi('DELETE', '/meetings/{meetingId}', inputs, opts?.credentials, {
      pathParams: ["meetingId"]
    });
  },

  async zoom_meetings_list(node, msg, inputs, opts) {
    return utils.zoomApi('GET', '/users/{userId}/meetings', inputs, opts?.credentials, {
      pathParams: ["userId"],
      queryParams: ["type", "page_size"]
    });
  },

  async zoom_meeting_registrants_list(node, msg, inputs, opts) {
    return utils.zoomApi('GET', '/meetings/{meetingId}/registrants', inputs, opts?.credentials, {
      pathParams: ["meetingId"]
    });
  },

  async zoom_meeting_participants_list(node, msg, inputs, opts) {
    return utils.zoomApi('GET', '/past_meetings/{meetingId}/participants', inputs, opts?.credentials, {
      pathParams: ["meetingId"]
    });
  }
};
