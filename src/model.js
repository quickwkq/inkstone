export const welcome = `# 留一点空白，给想法。

欢迎来到 **墨页**。一个安静的地方，用来阅读、思考，以及把想法写下来。

## 从一句话开始

直接在这里输入。用 Markdown 整理思绪，格式会自然呈现。你也可以切换到源码模式，掌握每一个字符。

> 写作，是让思考慢下来的方式。

## 让文字有条理

- 用 **加粗** 标记重点，用 *斜体* 留下旁注
- 输入 \`# \` 创建标题，在左侧大纲中快速跳转
- 用列表，把一个大想法拆成小步骤

### 今天的小计划

- [x] 找到一个安静的写作空间
- [ ] 记下第一个灵感
- [ ] 写一篇值得保存的笔记

## 代码，也可以很清楚

\`\`\`javascript
const idea = '从这里开始';
console.log(idea);
\`\`\`

## 你的文字，留在本地

草稿自动保存在本机。点击「保存文件」把文档保存为 .md；你也可以打开已有文件，或导出 HTML 与 PDF。

| 快捷键 | 操作 |
| --- | --- |
| ⌘ / Ctrl + S | 保存 Markdown |
| ⌘ / Ctrl + O | 打开文件 |
| ⌘ / Ctrl + N | 新建文档 |

---

慢慢写，不必急。
`;
export function makeDoc(name='未命名.md',content='') { return {id:crypto.randomUUID(),name,content,updated:Date.now()}; }
export function safeName(name) { return (name.trim().replace(/[\\/:*?"<>|]/g,'-') || '未命名').replace(/\.md$/i,'')+'.md'; }
export function outline(md) {let fence=false;return md.split('\n').flatMap((line,index)=>{if(/^\s*(```|~~~)/.test(line)){fence=!fence;return [];}const m=!fence&&/^(#{1,6})\s+(.+?)(?:\s+#+)?$/.exec(line);return m?[{level:m[1].length,text:m[2],line:index}]:[];});}
export function loadDocs(storage) { const raw=storage.getItem('inkstone.docs'); if(!raw)return [makeDoc('欢迎来到墨页.md',welcome)];const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||!parsed.every(d=>typeof d.id==='string'&&typeof d.name==='string'&&typeof d.content==='string'))throw Error('草稿数据格式异常，原始数据已保留。');return parsed.length?parsed:[makeDoc()]; }
