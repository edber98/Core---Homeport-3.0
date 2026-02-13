const { utils } = require("./utils");

module.exports = {
  async dbx_upload_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin de destination requis." };

    let body;
    const fileVal = d.file || d.content;

    if (fileVal && opts.files && typeof fileVal === 'object' && fileVal._type === 'fileRef') {
      body = await opts.files.resolveAsBuffer(fileVal);
    } else if (fileVal && opts.files && typeof fileVal === 'string' && /^https?:\/\//i.test(fileVal)) {
      body = await opts.files.resolveAsBuffer(fileVal);
    } else {
      body = fileVal || "";
    }

    const args = {
      path: d.path,
      mode: d.mode || "overwrite",
      autorename: true,
      mute: false
    };

    log('Téléversement en cours...');
    const res = await utils.dbxRequest(opts, "/files/upload", args, {
      isContent: true, upload: body
    });
    if (!res.ok) return res;
    return { ok: true, ...utils.mapEntry(res.data) };
  }
};
