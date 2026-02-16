const { utils } = require("./utils");

module.exports = {
  async typeform_images_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.typeformRequest(opts, "/images");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const images = res.data || [];
    return { ok: true, status: "success", message: JSON.stringify(images), totalCount: Array.isArray(images) ? images.length : 0, totalPages: 0 };
  }
};
