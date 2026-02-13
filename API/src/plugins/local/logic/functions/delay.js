exports.key = 'delay';
exports.run = async (node, msg, inputs, opts) => {
  const ms = Math.max(0, Number(inputs.ms) || 100);
  const log = opts && opts.log ? opts.log : () => {};
  const start = Date.now();
  const step = Math.min(1000, ms);

  if (ms > 1000) {
    let remaining = ms;
    while (remaining > step) {
      await new Promise(r => setTimeout(r, step));
      remaining = ms - (Date.now() - start);
      if (remaining > 0) {
        const secs = Math.ceil(remaining / 1000);
        log(`⏱ ${secs}s restantes...`);
      }
    }
    const left = ms - (Date.now() - start);
    if (left > 0) await new Promise(r => setTimeout(r, left));
  } else {
    await new Promise(r => setTimeout(r, ms));
  }

  return { ok: true, waited: Date.now() - start };
};
