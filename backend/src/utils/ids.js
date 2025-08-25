const { randomBytes } = require('crypto');

function newId(prefix='id'){
  const t = Date.now().toString(36);
  const r = randomBytes(4).toString('hex');
  return `${prefix}_${t}_${r}`;
}

module.exports = { newId };

