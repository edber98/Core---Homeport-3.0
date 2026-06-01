const { utils } = require('./utils');
module.exports = {
  async zoom_webinar_registrant_create(node, msg, inputs, opts) {
    return utils.zoomApi('POST', '/webinars/{webinarId}/registrants', inputs, opts?.credentials, {
      pathParams: ['webinarId'],
      bodyParams: ['email', 'first_name', 'last_name']
    });
  }
};
