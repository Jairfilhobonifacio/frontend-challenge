const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const Module = require('node:module');
const root = path.resolve(__dirname,'../..');
const output=buildSync({entryPoints:[path.join(root,'src/features/design-system/design-system-utils.ts')],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'}).outputFiles[0].text;
const compiled=new Module(path.join(__dirname,'design-runtime.cjs'));compiled._compile(output,path.join(__dirname,'design-runtime.cjs'));
const {dtcg,palette,contrastRatio,tokenEntries}=compiled.exports;

test('DS · contraste não arredonda limiares e compõe alfa contra o fundo',()=>{
  const c=k=>palette.find(p=>p.key===k);
  assert.ok(contrastRatio(c('ink'),c('paper'))>15);
  assert.ok(contrastRatio(c('muted'),c('plate'))<4.5);
  assert.ok(contrastRatio(c('paper'),c('action'))>=4.5);
  assert.equal(contrastRatio(c('ink'),c('ink')),1);
  assert.ok(contrastRatio(c('hair'),c('paper'))<3);
  assert.notEqual(contrastRatio(c('hair'),c('paper')),contrastRatio(c('ink'),c('paper')));
});
test('DS · DTCG: aliases resolvem sem ciclos, tipos coerentes e dimensões estruturadas',()=>{
  const entries=new Map(tokenEntries.map(t=>[t.path,t]));
  function resolve(p,seen=[]){assert.ok(!seen.includes(p),`ciclo em ${p}`);assert.ok(entries.has(p),`alias ausente ${p}`);const t=entries.get(p);if(typeof t.$value==='string'&&t.$value.startsWith('{')){const target=resolve(t.$value.slice(1,-1),[...seen,p]);assert.equal(t.$type,target.$type);return target;}return t;}
  for(const entry of tokenEntries){
    assert.ok(entry.$description?.length);assert.ok(entry.$type);
    const t=resolve(entry.path),v=t.$value;
    if(t.$type==='dimension') {assert.ok(['px','rem'].includes(v.unit));assert.equal(typeof v.value,'number');}
    if(t.$type==='color'){assert.equal(v.colorSpace,'srgb');assert.equal(v.components.length,3);v.components.forEach(c=>assert.ok(c>=0&&c<=1));assert.ok(v.alpha>=0&&v.alpha<=1);}
    if(t.$type==='cubicBezier'){assert.equal(v.length,4);assert.ok(v[0]>=0&&v[0]<=1&&v[2]>=0&&v[2]<=1);}
    if(t.$type==='border'){assert.equal(resolve(v.color.slice(1,-1)).$type,'color');assert.equal(resolve(v.width.slice(1,-1)).$type,'dimension');assert.equal(v.style,'solid');}
  }
  assert.equal(dtcg.primitive.radius.outer.$value.value,dtcg.primitive.radius.inner.$value.value+dtcg.primitive.dimension['frame-padding'].$value.value);
});
test('DS · fonte canônica, CSS gerado e 20 desenhos únicos permanecem sincronizados',()=>{
  const css=fs.readFileSync(path.join(root,'src/styles/tokens.css'),'utf8');
  const variables=new Set([...css.matchAll(/(--[\w-]+):/g)].map(m=>m[1]));
  for(const match of css.matchAll(/var\((--[\w-]+)\)/g))assert.ok(variables.has(match[1]),`variável ausente: ${match[1]}`);
  const icons=fs.readdirSync(path.join(root,'assets/icons')).filter(f=>/^k-icon-.+\.svg$/.test(f));assert.equal(icons.length,20);
  const generated=fs.readFileSync(path.join(root,'src/components/icons/kronos-icon-data.ts'),'utf8');
  icons.forEach(file=>{assert.ok(generated.includes(`"${file.slice(7,-4)}"`));const svg=fs.readFileSync(path.join(root,'assets/icons',file),'utf8');assert.ok(svg.includes('width="3" height="3"'));});
  const manual=fs.readFileSync(path.join(root,'DESIGN_SYSTEM.md'),'utf8');tokenEntries.forEach(t=>assert.ok(manual.includes(`\`${t.path}\``),`documentação ausente ${t.path}`));
});
