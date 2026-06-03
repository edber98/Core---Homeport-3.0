// Zoom API handler functions
// Category: recordings

const { utils } = require('./utils');

module.exports = {
  async zoom_recordings_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('GET', '/users/{userId}/recordings', inputs, opts?.credentials, {
        pathParams: ["userId"],
        queryParams: ["from", "to", "page_size"]
      });
    }
};
