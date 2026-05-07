const fs = require('fs');
const path = require('path');
const { parseArgs, signPayload } = require('./crypto-utils');

const args = parseArgs(process.argv.slice(2));
if (!args.privateKey) {
  console.error('Usage: node tools/generate-license.js --privateKey keys/private-key.pem --licenseId LIC-001 --licenseKey xxx --subject name --expiresAt 2027-01-01T00:00:00Z [--deviceId id] [--universal] [--channel official] [--features features.json] [--out file.license]');
  process.exit(1);
}

const features = args.features ? JSON.parse(fs.readFileSync(path.resolve(args.features), 'utf8')) : undefined;
const payload = {
  licenseId: args.licenseId || `LIC-${Date.now()}`,
  licenseKey: args.licenseKey || `key-${Date.now()}`,
  subject: args.subject || '授权用户',
  channel: args.channel || 'official',
  deviceId: args.universal ? '' : (args.deviceId || ''),
  universal: Boolean(args.universal),
  scope: args.universal ? 'universal' : 'device',
  notBefore: args.notBefore || '',
  expiresAt: args.expiresAt || '',
  minAppVersion: args.minAppVersion || '',
  maxAppVersion: args.maxAppVersion || '',
  features
};
Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

const privateKey = fs.readFileSync(path.resolve(args.privateKey), 'utf8');
const envelope = { payload, signature: signPayload(payload, privateKey) };
const out = path.resolve(args.out || `${payload.licenseId}.license`);
fs.writeFileSync(out, JSON.stringify(envelope, null, 2));
console.log(`License written to ${out}`);
