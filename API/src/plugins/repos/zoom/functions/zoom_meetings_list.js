// Zoom API handler functions
// Category: meetings

const { utils } = require('./utils');

module.exports = {
  async zoom_meetings_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('GET', '/users/{userId}/meetings', inputs, opts?.credentials, {
        pathParams: ["userId"],
        queryParams: ["type", "page_size"]
      });
    }
};
