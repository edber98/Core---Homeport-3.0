// Zoom API handler functions
// Category: reports

const { utils } = require('./utils');

module.exports = {
  async zoom_phone_users_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('GET', '/phone/users', inputs, opts?.credentials, {
        queryParams: ["page_size", "status"]
      });
    }
};
