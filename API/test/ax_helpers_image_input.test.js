const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveImageInput } = require('../src/plugins/repos/_shared/ax-helpers');

test('resolveImageInput accepts serialized fileRef JSON from template rendering', async () => {
  const fileRefJson = JSON.stringify({
    _type: 'fileRef',
    fileId: 'file_mnopl531_fbb9f859',
    name: 'Carte de visite moderne de Julie Martin.png',
    mimeType: 'image/png',
    size: 155827,
  });

  let resolved = null;
  const out = await resolveImageInput({ image: fileRefJson }, {
    files: {
      async resolveAsBuffer(fileRef) {
        resolved = fileRef;
        return Buffer.from('png-binary');
      },
    },
  });

  assert.equal(resolved?.fileId, 'file_mnopl531_fbb9f859');
  assert.equal(out?.mimeType, 'image/png');
  assert.equal(out?.base64, Buffer.from('png-binary').toString('base64'));
});

test('resolveImageInput does not mistake arbitrary long text for raw base64', async () => {
  const out = await resolveImageInput({
    image: '{"foo":"this is a long json-like string that should not be treated as base64 data for an image upload"}',
  }, {});

  assert.equal(out, null);
});
