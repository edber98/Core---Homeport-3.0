// Zoom API handler functions
// Category: webinars

const { utils } = require('./utils');

module.exports = {
  async zoom_webinar_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('GET', '/webinars/{webinarId}', inputs, opts?.credentials, {
        pathParams: ["webinarId"]
      });
    }
};
