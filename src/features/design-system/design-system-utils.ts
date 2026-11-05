import dtcg from '@/styles/design-tokens.dtcg.json';
export { dtcg };
export interface DesignToken { $type: string; $value: unknown; $description: string; $extensions?: { 'archive.kronos'?: Record<string, unknown> } }
export interface TokenEntry extends DesignToken { path: string }
export function flattenTokens(node: unknown = dtcg, prefix = ''): TokenEntry[] {
  const obj = node as Record<string, unknown>;
  if ('$value' in obj) return [{ path: prefix, ...(obj as unknown as DesignToken) }];
  return Object.entries(obj).filter(([k,v]) => !k.startsWith('$') && v && typeof v === 'object').flatMap(([k,v]) => flattenTokens(v, prefix ? `${prefix}.${k}` : k));
}
export const tokenEntries = flattenTokens();
export const palette = Object.entries(dtcg.primitive.color).filter(([key]) => key !== 'media-outline').map(([key,t]) => {
  const meta = (t as DesignToken).$extensions?.['archive.kronos'] ?? {};
  return { key, css:`--${key}`, name:String(meta.name), hex:t.$value.hex, rgb:t.$value.components.map(n=>Math.round(n*255)), alpha:t.$value.alpha,
    oklch:String(meta.oklch), description:t.$description };
});
export type PaletteColor = typeof palette[number];
export function colorCss(color: PaletteColor) { return color.alpha === 1 ? color.hex : `rgb(${color.rgb.join(' ')} / ${color.alpha})`; }
const paper = [240,241,237];
function composite(rgb:number[], alpha:number, bg:number[]) { return rgb.map((v,i)=>v*alpha+bg[i]*(1-alpha)); }
export function contrastRatio(fg: PaletteColor, bg: PaletteColor) {
  const background=composite(bg.rgb,bg.alpha,paper), foreground=composite(fg.rgb,fg.alpha,background);
  const luminance=(rgb:number[])=>rgb.map(n=>{const c=n/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
  const [a,b]=[luminance(foreground),luminance(background)];
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
export function downloadFile(filename:string,content:string,type='text/plain;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const link=document.createElement('a'); link.href=url; link.download=filename; document.body.append(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function copyText(value:string) {
  if(navigator.clipboard?.writeText) { try { await navigator.clipboard.writeText(value); return true; } catch { /* file:// and iframe fallback */ } }
  const before=document.activeElement as HTMLElement|null;
  const input=document.createElement('textarea'); input.value=value; input.setAttribute('aria-label','Texto para copiar');
  input.style.cssText='position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0'; document.body.append(input); input.select();
  try { return document.execCommand('copy'); }
  catch { return false; }
  finally { input.remove(); before?.focus({preventScroll:true}); }
}
export const specimenArtwork = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 400"><rect width="480" height="400" fill="#c3b8a6"/><g fill="none" stroke="#413d34" stroke-width="1.4">${Array.from({length:44},(_,i)=>`<ellipse cx="240" cy="200" rx="${30+i*4.2}" ry="${28+i*3.2}" transform="rotate(${i*2.1} 240 200)"/>`).join('')}</g><path d="M0 290L480 110V190L0 370Z" fill="#b75e39" opacity=".88"/><path d="M0 312L480 132" stroke="#e9dfca" stroke-width="2"/></svg>`)}`;
