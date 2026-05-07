const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { parseArgs } = require('./crypto-utils');

const args = parseArgs(process.argv.slice(2));
const version = args.version || JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
let body = '';
try {
  body = execSync('git log --pretty=format:- %s -n 30', { encoding: 'utf8' });
} catch (error) {
  body = args.body || '暂无更新说明。';
}

const notes = { show: true, title: args.title || '更新说明', version, body };
const out = path.resolve(args.out || `release-notes-${version}.json`);
fs.writeFileSync(out, JSON.stringify(notes, null, 2));
console.log(`Release notes written to ${out}`);
