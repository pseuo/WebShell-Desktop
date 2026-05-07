const fs = require('fs');
const path = require('path');
const { parseArgs, signPayload } = require('./crypto-utils');

const args = parseArgs(process.argv.slice(2));
const input = args._ || process.argv.slice(2).find(item => !item.startsWith('--'));
if (!input || !args.privateKey) {
  console.error('Usage: node tools/sign-remote-config.js config.json --privateKey keys/private-key.pem [--out signed-config.json]');
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
const privateKey = fs.readFileSync(path.resolve(args.privateKey), 'utf8');
const envelope = { payload, signature: signPayload(payload, privateKey) };
const out = path.resolve(args.out || input.replace(/\.json$/i, '.signed.json'));
fs.writeFileSync(out, JSON.stringify(envelope, null, 2));
console.log(`Signed config written to ${out}`);
