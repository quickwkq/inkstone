import test from 'node:test';
import assert from 'node:assert/strict';
import {createTheme} from '../src/theme.js';

function fixture(saved=null,dark=false) {
  let value=saved, listener;
  const media={matches:dark,addEventListener:(_,fn)=>listener=fn,removeEventListener:()=>listener=null};
  const applied=[];
  const theme=createTheme({storage:{getItem:()=>value,setItem:(_,v)=>value=v},media,apply:(...args)=>applied.push(args)});
  return {theme,applied,value:()=>value,system(dark){media.matches=dark;listener?.();}};
}
test('defaults to system and follows live appearance changes',()=>{
  const f=fixture();assert.deepEqual(f.applied.at(-1),['light','system']);
  f.system(true);assert.deepEqual(f.applied.at(-1),['dark','system']);
  f.theme.set('light');f.system(false);f.system(true);
  assert.deepEqual(f.applied.at(-1),['light','light']);assert.equal(f.value(),'light');
  f.theme.set('system');assert.deepEqual(f.applied.at(-1),['dark','system']);
  f.theme.dispose();const count=f.applied.length;f.system(false);assert.equal(f.applied.length,count);
});
test('retains explicit legacy preferences and falls back for invalid storage',()=>{
  assert.deepEqual(fixture('dark').applied.at(-1),['dark','dark']);
  assert.deepEqual(fixture('light',true).applied.at(-1),['light','light']);
  assert.deepEqual(fixture('invalid',true).applied.at(-1),['dark','system']);
});
test('storage failure does not prevent theme changes',()=>{
  let applied,errors=0;
  const theme=createTheme({storage:{getItem(){throw Error();},setItem(){throw Error();}},media:{matches:false,addEventListener(){},removeEventListener(){}},apply:value=>applied=value,onError:()=>errors++});
  theme.set('dark');assert.equal(applied,'dark');assert.equal(errors,1);
});
