const crypto = require('crypto');

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function signPayload(payload, privateKey) {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(stableStringify(payload));
  signer.end();
  return signer.sign(privateKey, 'base64');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const [key, inline] = item.slice(2).split('=');
    args[key] = inline ?? argv[++i] ?? true;
  }
  return args;
}

module.exports = { stableStringify, signPayload, parseArgs };
