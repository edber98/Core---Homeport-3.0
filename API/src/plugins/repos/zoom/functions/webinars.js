// Zoom API handler functions
// Category: webinars

const { utils } = require('./utils');

module.exports = {
  async zoom_webinar_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return utils.zoomApi('POST', '/users/{userId}/webinars', inputs, opts?.credentials, {
      pathParams: ["userId"],
      bodyParams: ["topic", "type", "start_time", "duration", "agenda"]
    });
  },

  async zoom_webinar_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return utils.zoomApi('GET', '/webinars/{webinarId}', inputs, opts?.credentials, {
      pathParams: ["webinarId"]
    });
  },

  async zoom_webinar_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return utils.zoomApi('PATCH', '/webinars/{webinarId}', inputs, opts?.credentials, {
      pathParams: ["webinarId"],
      bodyParams: ["topic", "start_time", "duration"]
    });
  },

  async zoom_webinar_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return utils.zoomApi('DELETE', '/webinars/{webinarId}', inputs, opts?.credentials, {
      pathParams: ["webinarId"]
    });
  },

  async zoom_webinars_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return utils.zoomApi('GET', '/users/{userId}/webinars', inputs, opts?.credentials, {
      pathParams: ["userId"],
      queryParams: ["page_size"]
    });
  }
};
