import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncDesignSystem } from './sync-design-system.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
syncDesignSystem();
const compiled=await build({
  absWorkingDir:root,entryPoints:['src/features/design-system/standalone.tsx'],bundle:true,write:false,
  outfile:'.build/design-system/index.js',format:'iife',platform:'browser',target:'es2022',minify:true,
  define:{'process.env.NODE_ENV':'"production"'},legalComments:'inline',
  plugins:[{name:'css-raw',setup(b){
    b.onResolve({filter:/\.css\?raw$/},args=>({path:resolve(root,args.path.replace('@/', 'src/').replace('?raw','')),namespace:'raw'}));
    b.onLoad({filter:/.*/,namespace:'raw'},args=>({contents:readFileSync(args.path,'utf8'),loader:'text'}));
  }}]
});
let fonts=readFileSync(resolve(root,'src/styles/fonts.css'),'utf8');
fonts=fonts.replace(/url\((\/fonts\/[^)]+)\)/g,(_,url)=>`url(data:font/ttf;base64,${readFileSync(resolve(root,`public${url}`)).toString('base64')})`);
const css=[fonts,...['tokens','layout','components','motion'].map(f=>readFileSync(resolve(root,`src/styles/${f}.css`),'utf8')),compiled.outputFiles.find(f=>f.path.endsWith('.css'))?.text??''].join('\n');
const js=compiled.outputFiles.find(f=>f.path.endsWith('.js')).text;
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const licenses=['barlowcondensed','manrope','ibmplexmono'].map(f=>`<details><summary>${f} / SIL OFL 1.1</summary><pre>${escape(readFileSync(resolve(root,`public/fonts/${f}-OFL.txt`),'utf8'))}</pre></details>`).join('');
const html=`<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#F0F1ED"><meta name="description" content="KRONOS // ARCHIVE — MIV & Design System Workbench v1.0. Tokens, contraste, tipografia, geometria e componentes interativos offline."><title>KRONOS // ARCHIVE — MIV & Design System Workbench</title><style>${css.replaceAll('</style','<\\/style')}\n.ds-standalone{max-width:1720px;margin:auto;padding-inline:var(--gutter)}.ds-licenses{border-top:1px solid var(--hair);padding-block:20px;font-size:11px}.ds-licenses pre{white-space:pre-wrap;font-size:10px}.ds-licenses>summary{font:11px var(--mono)}</style></head><body><a class="skip-link" href="#main-content">Pular para o conteúdo</a><main class="ds-standalone" id="main-content"><div id="root"></div><details class="ds-licenses"><summary>Licenças das fontes e bibliotecas incorporadas</summary>${licenses}<details><summary>React / MIT</summary><pre>${escape(readFileSync(resolve(root,'node_modules/react/LICENSE'),'utf8'))}</pre></details></details></main><noscript>Ative o JavaScript para usar o workbench interativo KRONOS.</noscript><script>${js.replaceAll('</script','<\\/script')}</script></body></html>\n`;
writeFileSync(resolve(root,'kronos-design-system.html'),html);
console.log(`Standalone built: ${(Buffer.byteLength(html)/1024).toFixed(0)} KiB. Fonts, icons, CSS, React and tokens embedded; no network dependency.`);
