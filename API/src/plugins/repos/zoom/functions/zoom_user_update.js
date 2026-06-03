// Zoom API handler functions
// Category: users

const { utils } = require('./utils');

module.exports = {
  async zoom_user_update(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('PATCH', '/users/{userId}', inputs, opts?.credentials, {
        pathParams: ["userId"],
        bodyParams: ["first_name", "last_name", "dept", "job_title"]
      });
    }
};
