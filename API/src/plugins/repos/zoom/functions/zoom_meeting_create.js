// Zoom API handler functions
// Category: meetings

const { utils } = require('./utils');

module.exports = {
  async zoom_meeting_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('POST', '/users/{userId}/meetings', inputs, opts?.credentials, {
        pathParams: ["userId"],
        bodyParams: ["topic", "type", "start_time", "duration", "timezone", "agenda", "password"]
      });
    }
};
