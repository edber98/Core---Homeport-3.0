// Zoom API handler functions
// Category: users

const { utils } = require('./utils');

module.exports = {
  async zoom_user_get(node, msg, inputs, opts) {
    return utils.zoomApi('GET', '/users/{userId}', inputs, opts?.credentials, {
      pathParams: ["userId"]
    });
  },

  async zoom_users_list(node, msg, inputs, opts) {
    return utils.zoomApi('GET', '/users', inputs, opts?.credentials, {
      queryParams: ["status", "page_size"]
    });
  },

  async zoom_user_get_settings(node, msg, inputs, opts) {
    return utils.zoomApi('GET', '/users/{userId}/settings', inputs, opts?.credentials, {
      pathParams: ["userId"]
    });
  },

  async zoom_user_update(node, msg, inputs, opts) {
    return utils.zoomApi('PATCH', '/users/{userId}', inputs, opts?.credentials, {
      pathParams: ["userId"],
      bodyParams: ["first_name", "last_name", "dept", "job_title"]
    });
  }
};
