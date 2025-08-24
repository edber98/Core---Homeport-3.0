const crypto = require('crypto');

function stableStringify(obj){
  return JSON.stringify(sortObj(obj));
}

function sortObj(x){
  if (Array.isArray(x)) return x.map(sortObj);
  if (x && typeof x === 'object'){
    const out = {};
    for (const k of Object.keys(x).sort()) out[k] = sortObj(x[k]);
    return out;
  }
  return x;
}

function sha256Hex(s){
  return crypto.createHash('sha256').update(s).digest('hex');
}

function checksumJSON(obj){
  return sha256Hex(stableStringify(obj));
}

module.exports = { checksumJSON, stableStringify };

