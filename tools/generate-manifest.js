const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' ? [] : walk(full);
    return [full];
  });
}

const root = process.cwd();
const wanted = file => /(^main\.js$|^preload\.js$|\.html$|^default\.license$|^tools[\\/].+\.js$)/.test(path.relative(root, file).replace(/\\/g, '/'));
const files = {};
walk(root).filter(wanted).forEach(file => {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  files[rel] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
});
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2));
console.log(`manifest.json written with ${Object.keys(files).length} files`);
