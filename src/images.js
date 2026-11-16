export function imageBase(id) { return `inkstone-image://localhost/${encodeURIComponent(id)}/`; }
export function localImageURL(src, id) {
  if (!src || /^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i.test(src)) return null;
  return new URL(src, imageBase(id)).href;
}

// Embed only the rendered output; never replace the image paths in Markdown.
export async function embedLocalImages(html, id) {
  const template=document.createElement('template');template.innerHTML=html;
  await Promise.all([...template.content.querySelectorAll('img')].map(async image=>{
    const url=localImageURL(image.getAttribute('src'),id);if(!url)return;
    try {
      const response=await fetch(url);if(!response.ok)throw Error('missing image');
      const blob=await response.blob();
      image.src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
    } catch { image.title='本地图片无法读取，请检查文档目录中的图片文件'; }
  }));
  return template.innerHTML;
}
