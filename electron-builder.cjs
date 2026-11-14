const signed = process.env.INKSTONE_SIGNED === '1';
if (signed && (!process.env.CSC_LINK || !process.env.CSC_KEY_PASSWORD || !process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID)) {
  throw new Error('Signed distribution requires CSC_LINK, CSC_KEY_PASSWORD, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD and APPLE_TEAM_ID');
}
module.exports = {
  appId:'com.quickwkq.inkstone', productName:'Inkstone',
  artifactName:'Inkstone-${version}-mac-${arch}.${ext}',
  directories:{output:'release',buildResources:'build'},
  files:['dist/**/*','electron/**/*','package.json'],
  asar:true,
  forceCodeSigning:signed,
  mac:{
    category:'public.app-category.productivity',icon:'build/icon.icns',
    target:['dmg','zip'],minimumSystemVersion:'13.0',
    identity:signed?undefined:null,
    hardenedRuntime:signed,notarize:signed,
    extendInfo:{NSHumanReadableCopyright:'© 2026 Inkstone'},
    fileAssociations:[{ext:['md','markdown'],name:'Markdown document',role:'Editor',rank:'Alternate',mimeType:'text/markdown'}]
  },
  dmg:{
    title:'Inkstone ${version}',
    background:'build/dmg-background.png',
    window:{width:640,height:420},
    contents:[{x:175,y:205,type:'file'},{x:465,y:205,type:'link',path:'/Applications'}]
  }
};
