const { utils } = require('./utils');
module.exports = {
  async zoom_webinar_registrants_list(node, msg, inputs, opts) {
    return utils.zoomApi('GET', '/webinars/{webinarId}/registrants', inputs, opts?.credentials, {
      pathParams: ['webinarId']
    });
  }
};
