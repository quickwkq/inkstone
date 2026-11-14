import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadDocs,outline,safeName} from '../src/model.js';
test('outline ignores fenced code and preserves heading depth',()=>{assert.deepEqual(outline('# A\n```md\n# not heading\n```\n### B'),[{level:1,text:'A',line:0},{level:3,text:'B',line:4}]);});
test('draft recovery retains exact Markdown',()=>{const content='# 中文\r\n\r\n- [ ] **任务**\n';const raw=JSON.stringify([{id:'x',name:'test.md',content}]);assert.equal(loadDocs({getItem:()=>raw})[0].content,content);});
test('corrupt storage fails without overwriting',()=>{assert.throws(()=>loadDocs({getItem:()=>'{broken'}));assert.throws(()=>loadDocs({getItem:()=>'{}'}));});
test('safe file names',()=>{assert.equal(safeName('../a/b.md'),'..-a-b.md');assert.equal(safeName(''),'未命名.md');});
