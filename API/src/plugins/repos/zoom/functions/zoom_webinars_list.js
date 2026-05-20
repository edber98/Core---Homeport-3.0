// Zoom API handler functions
// Category: webinars

const { utils } = require('./utils');

module.exports = {
  async zoom_webinars_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('GET', '/users/{userId}/webinars', inputs, opts?.credentials, {
        pathParams: ["userId"],
        queryParams: ["page_size"]
      });
    }
};
