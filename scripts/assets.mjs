import {cp,mkdir} from 'node:fs/promises';
await mkdir('public/vendor/vditor', {recursive:true});
await cp('node_modules/vditor/dist', 'public/vendor/vditor/dist', {recursive:true});
