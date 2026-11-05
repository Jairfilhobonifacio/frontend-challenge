import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const tokens = JSON.parse(readFileSync(resolve(root, 'src/styles/design-tokens.dtcg.json'), 'utf8'));
export function flatten(node = tokens, prefix = '', result = []) {
  if ('$value' in node) result.push({ path: prefix, ...node });
  else for (const [key, value] of Object.entries(node)) if (!key.startsWith('$') && value && typeof value === 'object') flatten(value, prefix ? `${prefix}.${key}` : key, result);
  return result;
}
const all = flatten();
export function resolveToken(path, seen = new Set()) {
  if (seen.has(path)) throw new Error(`Circular token: ${path}`);
  const item = all.find(t => t.path === path);
  if (!item) throw new Error(`Missing token: ${path}`);
  seen.add(path);
  return typeof item.$value === 'string' && item.$value.startsWith('{') ? resolveToken(item.$value.slice(1, -1), seen) : item;
}
function cssValue(item) {
  const ext = item.$extensions?.['archive.kronos'];
  if (ext?.cssExpression) return ext.cssExpression;
  const v = item.$value;
  if (typeof v === 'string' && v.startsWith('{')) {
    const target = all.find(t => t.path === v.slice(1, -1));
    if (!target) throw new Error(`Missing alias ${v}`);
    return target.$extensions?.['archive.kronos']?.css ? `var(${target.$extensions['archive.kronos'].css})` : cssValue(resolveToken(target.path));
  }
  switch(item.$type) {
    case 'color': return v.alpha === 1 ? v.hex : `rgb(${v.components.map(n => Math.round(n * 255)).join(' ')} / ${v.alpha})`;
    case 'dimension': case 'duration': return `${v.value}${v.unit}`;
    case 'fontFamily': return v.map(f => f.includes(' ') ? `'${f}'` : f).join(', ');
    case 'cubicBezier': return `cubic-bezier(${v.join(', ')})`;
    case 'border': return `${cssValue({$type:'dimension',$value:v.width})} ${v.style} ${cssValue({$type:'color',$value:v.color})}`;
    default: throw new Error(`Unsupported CSS token: ${item.path}`);
  }
}
export const tokenCss = `/* GENERATED from design-tokens.dtcg.json. Run npm run ds:sync. */\n:root {\n${all.filter(t=>t.$extensions?.['archive.kronos']?.css).map(t=>`  ${t.$extensions['archive.kronos'].css}: ${cssValue(t)};`).join('\n')}\n}\n`;
export function syncDesignSystem() {
  writeFileSync(resolve(root, 'src/styles/tokens.css'), tokenCss);
  const icons = Object.fromEntries(readdirSync(resolve(root,'assets/icons')).filter(f=>/^k-icon-.+\.svg$/.test(f)).sort().map(f=>{
    const svg = readFileSync(resolve(root,'assets/icons',f),'utf8');
    if (/<script|on\w+=|<foreignObject|href=/i.test(svg)) throw new Error(`Unexpected icon content: ${f}`);
    return [f.slice(7,-4), svg.replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'')];
  }));
  if(Object.keys(icons).length!==20) throw new Error('KRONOS requires 20 canonical icons');
  writeFileSync(resolve(root,'src/components/icons/kronos-icon-data.ts'), `// GENERATED from assets/icons/k-icon-*.svg. Run npm run ds:sync.\nexport const kronosIconMarkup = ${JSON.stringify(icons,null,2)} as const;\nexport const kronosIconNames = Object.keys(kronosIconMarkup) as (keyof typeof kronosIconMarkup)[];\n`);
  const docPath=resolve(root,'DESIGN_SYSTEM.md');
  let manual=readFileSync(docPath,'utf8');
  const colors=Object.entries(tokens.primitive.color).filter(([key])=>key!=='media-outline');
  const paletteTable=['| CSS / Primitive | Nome | HEX / alfa | RGB | OKLCH | Papel |','| --- | --- | --- | --- | --- | --- |',...colors.map(([key,t])=>`| \`--${key}\` / \`primitive.color.${key}\` | ${t.$extensions['archive.kronos'].name} | \`${t.$value.hex}${t.$value.alpha!==1?' / 18%':''}\` | ${t.$extensions['archive.kronos'].rgb} | \`${t.$extensions['archive.kronos'].oklch}\` | ${tokens.semantic.color[key].$description} |`)].join('\n');
  const composite=(c,bg)=>c.components.map((v,i)=>v*c.alpha+bg[i]*(1-c.alpha));
  const lum=c=>c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>{const bg=composite(b,tokens.primitive.color.paper.$value.components);const f=lum(composite(a,bg)),back=lum(bg);return (Math.max(f,back)+.05)/(Math.min(f,back)+.05);};
  const matrix=['| Texto ↓ / Fundo → | '+colors.map(([key])=>key).join(' | ')+' |','| --- | '+colors.map(()=>'---').join(' | ')+' |',...colors.map(([key,a])=>'| '+key+' | '+colors.map(([,b])=>{const r=ratio(a.$value,b.$value);return `${r.toFixed(2)} · ${r>=7?'AAA':r>=4.5?'AA':'×'}`;}).join(' | ')+' |')].join('\n');
  const inventory=['| Token | Tipo | CSS | Valor / alias |','| --- | --- | --- | --- |',...all.map(t=>`| \`${t.path}\` | ${t.$type} | ${t.$extensions?.['archive.kronos']?.css??'—'} | \`${JSON.stringify(t.$value).replaceAll('|','\\|')}\` |`)].join('\n');
  for(const [label,table] of [['PALETTE',paletteTable],['CONTRAST',matrix],['TOKENS',inventory]]) manual=manual.replace(new RegExp(`<!-- ${label}:START -->[\\s\\S]*?<!-- ${label}:END -->`),`<!-- ${label}:START -->\n${table}\n<!-- ${label}:END -->`);
  writeFileSync(docPath,manual);
  console.log(`Design system synced: ${all.length} tokens / ${Object.keys(icons).length} icons.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) syncDesignSystem();
