// Zoom API handler functions
// Category: users

const { utils } = require('./utils');

module.exports = {
  async zoom_users_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('GET', '/users', inputs, opts?.credentials, {
        queryParams: ["status", "page_size"]
      });
    }
};
