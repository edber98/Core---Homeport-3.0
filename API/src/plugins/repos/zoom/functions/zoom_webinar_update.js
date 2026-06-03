// Zoom API handler functions
// Category: webinars

const { utils } = require('./utils');

module.exports = {
  async zoom_webinar_update(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('PATCH', '/webinars/{webinarId}', inputs, opts?.credentials, {
        pathParams: ["webinarId"],
        bodyParams: ["topic", "start_time", "duration"]
      });
    }
};
