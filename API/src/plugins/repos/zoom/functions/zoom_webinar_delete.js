// Zoom API handler functions
// Category: webinars

const { utils } = require('./utils');

module.exports = {
  async zoom_webinar_delete(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('DELETE', '/webinars/{webinarId}', inputs, opts?.credentials, {
        pathParams: ["webinarId"]
      });
    }
};
