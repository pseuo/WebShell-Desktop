const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseArgs } = require('./crypto-utils');

const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(args.out || 'keys');
fs.mkdirSync(outDir, { recursive: true });

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: Number(args.bits || 2048),
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

fs.writeFileSync(path.join(outDir, 'private-key.pem'), privateKey);
fs.writeFileSync(path.join(outDir, 'public-key.pem'), publicKey);
console.log(`Keypair written to ${outDir}`);
