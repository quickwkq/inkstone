import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {version}=JSON.parse(await readFile('package.json','utf8'));
const files=(await readdir('release')).filter(f=>f.startsWith('Inkstone-'+version+'-mac-')&&/\.(dmg|zip)$/.test(f)).sort();
if(!files.length)throw Error('No distribution artifacts found');
const lines=await Promise.all(files.map(async f=>createHash('sha256').update(await readFile('release/'+f)).digest('hex')+'  '+f));
await writeFile('release/SHA256SUMS.txt',lines.join('\n')+'\n');
console.log(lines.join('\n'));
