import test from 'node:test';
import assert from 'node:assert/strict';
import {groupDocuments,recentDrafts} from '../src/sidebar.js';

test('groups actual parent paths, separates same-name folders and keeps drafts',()=>{
  const docs=[{name:'a.md',content:'',path:'/工作/笔记/a.md'},{name:'b.md',content:'',path:'/个人/笔记/b.md'},{name:'draft.md',content:''},{name:'root.md',content:'',path:'/root.md'}];
  const groups=groupDocuments(docs);
  assert.deepEqual(groups.map(g=>g.key),['/工作/笔记','/个人/笔记','drafts','/']);
  assert.deepEqual(groups.map(g=>g.name),['笔记','笔记','草稿','/']);
});
test('search finds content and filename without changing source ordering',()=>{
  const docs=[{name:'Alpha.md',content:'hello'},{name:'b.md',content:'ALPHA'}];
  assert.deepEqual(groupDocuments(docs,'alpha')[0].docs,docs);
  assert.deepEqual(groupDocuments(docs,'missing'),[]);
});
test('recent drafts use last opening time and preserve original list',()=>{
  const docs=[{id:'a',lastOpened:10,updated:100},{id:'b',updated:20}];
  assert.deepEqual(recentDrafts(docs).map(d=>d.id),['b','a']);
  assert.deepEqual(docs.map(d=>d.id),['a','b']);
});
