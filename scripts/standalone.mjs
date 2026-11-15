import { readFile, writeFile, readdir } from 'node:fs/promises';
const files=await readdir(new URL('../dist/assets/',import.meta.url));
const js=await readFile(new URL('../dist/assets/'+files.find(f=>f.endsWith('.js')),import.meta.url),'utf8');
const css=await readFile(new URL('../dist/assets/'+files.find(f=>f.endsWith('.css')),import.meta.url),'utf8');
let html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
html=html.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/,'').replace(/<link[^>]*rel="stylesheet"[^>]*>/,'');
html=html.replace('</head>',()=>`<style>${css}</style></head>`).replace('</body>',()=>`<script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script></body>`);
await writeFile(new URL('../余潮.html',import.meta.url),html);
console.log('Standalone game written: 余潮.html (no server or network required)');
