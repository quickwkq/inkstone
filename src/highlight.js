import lightStyle from 'vditor/dist/js/highlight.js/styles/github.min.css?raw';

export const exportCodeStyle = lightStyle;
let loading;

// Use the same bundled language definitions as the editor, without a network CDN.
async function highlighter() {
  if (window.hljs) return window.hljs;
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('vendor/vditor/dist/js/highlight.js/highlight.min.js', document.baseURI).href;
    script.onload = () => resolve(window.hljs);
    script.onerror = () => { loading = undefined; script.remove(); reject(new Error('代码高亮资源加载失败')); };
    document.head.append(script);
  });
  return loading;
}

export async function highlightHTML(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  const blocks = container.querySelectorAll('pre > code');
  if (!blocks.length) return html;
  const hljs = await highlighter();
  for (const block of blocks) {
    const language = [...block.classList].find(name => name.startsWith('language-'))?.slice(9);
    // Unknown or unlabelled fences remain plain text; do not guess the language.
    if (!language || !hljs.getLanguage(language)) continue;
    block.innerHTML = hljs.highlight(block.textContent, { language, ignoreIllegals: true }).value;
    block.classList.add('hljs');
  }
  return container.innerHTML;
}
