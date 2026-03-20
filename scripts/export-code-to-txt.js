/**
 * 将所有 .js 代码导出为单个 txt 文件，便于提交纯文字版
 */
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..');
const exclude = /node_modules|\.expo|coverage/;

function walk(dir) {
  let result = [];
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !exclude.test(full)) {
        result = result.concat(walk(full));
      } else if ((f.endsWith('.js') || f.endsWith('.jsx')) && !exclude.test(full)) {
        result.push(full);
      }
    }
  } catch (e) {}
  return result;
}

const all = walk(base).sort();
let out = 'DisasterReadyTokyo - Code Snapshot\n';
out += 'Generated: ' + new Date().toISOString().slice(0, 10) + '\n';
out += 'Total files: ' + all.length + '\n';
out += '='.repeat(60) + '\n\n';

for (const f of all) {
  const rel = path.relative(base, f).replace(/\\/g, '/');
  out += '\n\n' + '='.repeat(60) + '\n';
  out += 'FILE: ' + rel + '\n';
  out += '='.repeat(60) + '\n\n';
  try {
    out += fs.readFileSync(f, 'utf8');
  } catch (e) {
    out += '[Error reading file: ' + e.message + ']\n';
  }
}

const outPath = path.join(base, 'CODE_SNAPSHOT.txt');
fs.writeFileSync(outPath, out, 'utf8');
console.log('Done. ' + all.length + ' files, ' + Math.round(out.length / 1024) + ' KB');
console.log('Output: ' + outPath);
