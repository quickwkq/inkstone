const modes = ['system', 'light', 'dark'];
export const normalizeTheme = value => modes.includes(value) ? value : 'system';

// Keep the user's choice separate from the resolved appearance.
export function createTheme({storage, media, apply, onError=()=>{}}) {
  let preference='system';
  try { preference=normalizeTheme(storage.getItem('inkstone.theme')); } catch { /* Use system when storage is unavailable. */ }
  const update=()=>apply(preference==='system'?(media.matches?'dark':'light'):preference,preference);
  const onSystemChange=()=>{if(preference==='system')update();};
  media.addEventListener('change',onSystemChange);
  update();
  return {
    set(value) {
      preference=normalizeTheme(value);
      try { storage.setItem('inkstone.theme',preference); } catch { onError(); }
      update();
    },
    dispose() { media.removeEventListener('change',onSystemChange); }
  };
}
