const { utils } = require('./utils');
module.exports = {
  async zoom_meeting_registrant_create(node, msg, inputs, opts) {
    return utils.zoomApi('POST', '/meetings/{meetingId}/registrants', inputs, opts?.credentials, {
      pathParams: ['meetingId'],
      bodyParams: ['email', 'first_name', 'last_name']
    });
  }
};
