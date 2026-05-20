// Zoom API handler functions
// Category: contacts

const { utils } = require('./utils');

module.exports = {
  async zoom_contacts_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return utils.zoomApi('GET', '/contacts', inputs, opts?.credentials, {
        queryParams: ["type", "page_size"]
      });
    }
};
