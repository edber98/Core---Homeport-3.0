// Zoom API handler functions
// Category: users

const { utils } = require('./utils');

module.exports = {
  async zoom_user_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('GET', '/users/{userId}', inputs, opts?.credentials, {
        pathParams: ["userId"]
      });
    }
};
