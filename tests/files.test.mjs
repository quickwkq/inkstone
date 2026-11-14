import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir,symlink,readlink,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import files from '../electron/files.cjs';
test('atomic save keeps Unicode content and leaves no temporary files',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'inkstone-'));
  try{const p=path.join(dir,'note.md');await files.atomicWrite(p,'# 中文\n');assert.equal((await files.readDocument(p)).content,'# 中文\n');await files.atomicWrite(p,'updated');assert.equal(await readFile(p,'utf8'),'updated');assert.deepEqual(await readdir(dir),['note.md']);}finally{await rm(dir,{recursive:true});}
});
test('saving through a symlink preserves the symlink',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'inkstone-'));
  try{const target=path.join(dir,'target.md'),link=path.join(dir,'link.md');await writeFile(target,'old');await symlink(target,link);await files.atomicWrite(link,'new');assert.equal(await readlink(link),target);assert.equal(await readFile(target,'utf8'),'new');}finally{await rm(dir,{recursive:true});}
});
test('invalid extensions and oversized files are rejected',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'inkstone-'));
  try{await assert.rejects(files.readDocument(path.join(dir,'bad.exe')));const p=path.join(dir,'big.md');await writeFile(p,Buffer.alloc(10*1024*1024+1));await assert.rejects(files.readDocument(p),/10 MB/);}finally{await rm(dir,{recursive:true});}
});
