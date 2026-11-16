import {readdir,copyFile,mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const {version}=JSON.parse(await readFile('package.json','utf8'));
await mkdir('release',{recursive:true});
for(const [target,arch] of [['aarch64-apple-darwin','arm64'],['x86_64-apple-darwin','x64']]){
  const roots=[`src-tauri/target/${target}/release/bundle`,...(arch===(process.arch==='arm64'?'arm64':'x64')?['src-tauri/target/release/bundle']:[])];
  for(const root of roots){
    let names;try{names=await readdir(join(root,'dmg'));}catch{continue;}
    const name=names.find(n=>n.endsWith('.dmg')&&n.includes(version));if(!name)continue;
    // Reject broken bundle signatures before distributing either archive.
    execFileSync('codesign',['--verify','--deep','--strict',join(root,'macos','Inkstone.app')],{stdio:'inherit'});
    await copyFile(join(root,'dmg',name),`release/Inkstone-${version}-mac-${arch}.dmg`);
    execFileSync('ditto',['-c','-k','--sequesterRsrc','--keepParent',join(root,'macos','Inkstone.app'),`release/Inkstone-${version}-mac-${arch}.zip`]);
    console.log(`Collected ${version} ${arch}`);break;
  }
}
