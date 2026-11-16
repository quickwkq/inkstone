import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {imageBase,localImageURL} from '../src/images.js';
createRequire(import.meta.url)('vditor/dist/js/lute/lute.min.js');

test('relative image URLs preserve Unicode and spaces without rewriting external images',()=>{
  assert.equal(localImageURL('images/中文 空格.png','doc'),imageBase('doc')+'images/%E4%B8%AD%E6%96%87%20%E7%A9%BA%E6%A0%BC.png');
  for(const src of ['https://example.com/pic.jpg','data:image/png;base64,abc','file:///tmp/pic.png','//example.com/a.jpg'])assert.equal(localImageURL(src,'doc'),null);
});
test('Vditor previews local images while preserving original Markdown paths',()=>{
  const lute=globalThis.Lute.New();lute.SetLinkBase(imageBase('doc'));
  const md='![图片](images/001.jpg)\n\n![中文](images/中文.png)\n';
  const dom=lute.Md2VditorIRDOM(md);
  assert.match(dom,/src="inkstone-image:\/\/localhost\/doc\/images\/001.jpg"/);
  const saved=lute.VditorIRDOM2Md(dom);
  assert.match(saved,/!\[图片\]\(images\/001.jpg\)/);
  assert.match(decodeURI(saved),/!\[中文\]\(images\/中文.png\)/);
  const baseline=globalThis.Lute.New();
  assert.equal(saved,baseline.VditorIRDOM2Md(baseline.Md2VditorIRDOM(md)));
  assert.ok(!saved.includes('inkstone-image:'));
});
