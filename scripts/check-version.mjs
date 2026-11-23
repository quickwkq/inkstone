import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const json = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const {version} = json('package.json');
const lock = json('package-lock.json');
assert.equal(lock.version, version, 'package-lock version mismatch');
assert.equal(lock.packages[''].version, version, 'package-lock root version mismatch');
assert.equal(json('src-tauri/tauri.conf.json').version, version, 'Tauri version mismatch');
for (const file of ['Cargo.toml', 'Cargo.lock']) {
  const text = readFileSync(new URL('../src-tauri/' + file, import.meta.url), 'utf8');
  const section = text.split(/(?=^\[)/m).find(part => /^name = "inkstone"$/m.test(part));
  assert.equal(section?.match(/^version = "([^"]+)"$/m)?.[1], version, file + ' version mismatch');
}
if (process.env.GITHUB_REF_TYPE === 'tag') {
  assert.equal(process.env.GITHUB_REF_NAME, 'v' + version, 'Release tag must match the package version');
}
console.log('Version verified: v' + version);
