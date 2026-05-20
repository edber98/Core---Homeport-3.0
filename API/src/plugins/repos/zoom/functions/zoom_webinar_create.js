// Zoom API handler functions
// Category: webinars

const { utils } = require('./utils');

module.exports = {
  async zoom_webinar_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('POST', '/users/{userId}/webinars', inputs, opts?.credentials, {
        pathParams: ["userId"],
        bodyParams: ["topic", "type", "start_time", "duration", "agenda"]
      });
    }
};
