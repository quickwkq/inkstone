const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
async function readDocument(file) {
  if (!['.md', '.markdown', '.txt'].includes(path.extname(file).toLowerCase())) throw Error('请选择 Markdown 或文本文件');
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > 10 * 1024 * 1024) throw Error('仅支持 10 MB 以内的文本文件');
  const content = await fs.readFile(file, 'utf8');
  return {name: path.basename(file), content, hash: digest(content)};
}
async function atomicWrite(file, content) {
  let target = file;
  try { target = await fs.realpath(file); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  let mode = 0o600;
  try { mode = (await fs.stat(target)).mode; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const temporary = path.join(path.dirname(target), '.' + path.basename(target) + '.' + crypto.randomUUID() + '.tmp');
  let handle;
  try {
    handle = await fs.open(temporary, 'wx', mode);
    await handle.writeFile(content, 'utf8'); await handle.sync();
    await handle.close(); handle = null;
    await fs.rename(temporary, target);
  } finally {
    await handle?.close();
    await fs.unlink(temporary).catch(e => { if (e.code !== 'ENOENT') throw e; });
  }
}
module.exports = {readDocument, atomicWrite, digest};
