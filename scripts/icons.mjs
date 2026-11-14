import sharp from 'sharp';
import {mkdir,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect x="62" y="62" width="900" height="900" rx="206" fill="#365643"/><rect x="256" y="204" width="512" height="616" rx="40" fill="#f6f5e9"/><path d="M626 204v146h142" fill="#c4d1bb"/><path d="M626 204l142 146H626z" fill="#dfe6d7"/><path d="M352 440h320M352 528h320M352 616h202" stroke="#365643" stroke-width="32" stroke-linecap="round"/><rect x="352" y="704" width="110" height="32" rx="16" fill="#9bab8e"/></svg>`;
await mkdir('build/icon.iconset',{recursive:true});
for(const size of [16,32,128,256,512]){
  await sharp(Buffer.from(icon)).resize(size,size).png().toFile(`build/icon.iconset/icon_${size}x${size}.png`);
  await sharp(Buffer.from(icon)).resize(size*2,size*2).png().toFile(`build/icon.iconset/icon_${size}x${size}@2x.png`);
}
execFileSync('iconutil',['-c','icns','build/icon.iconset','-o','build/icon.icns']);
await sharp(Buffer.from(icon)).resize(512,512).png().toFile('build/icon.png');
const background = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="640" height="420" fill="#f3f4ef"/><text x="320" y="66" text-anchor="middle" font-family="Helvetica" font-size="30" font-weight="600" fill="#365643">Inkstone</text><text x="320" y="100" text-anchor="middle" font-family="Helvetica" font-size="14" fill="#7b887a">A quiet place for your words.</text><path d="M288 205h64m-14-14 14 14-14 14" fill="none" stroke="#99ab92" stroke-width="3" stroke-linecap="round"/><text x="320" y="355" text-anchor="middle" font-family="Helvetica" font-size="14" fill="#596a55">Drag Inkstone into Applications to install.</text></svg>`;
await sharp(Buffer.from(background)).png().toFile('build/dmg-background.png');
await rm('build/icon.iconset',{recursive:true});
console.log('Generated application icon and drag-to-install background.');
