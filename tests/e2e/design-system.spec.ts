import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('DS 01 · rota, legado, header, índice e saída para o catálogo',async({page})=>{
  await page.goto('/?view=design');await expect(page).toHaveURL(/\/design/);
  await expect(page.locator('.ds-section')).toHaveCount(6);
  await expect(page.getByRole('button',{name:'06 / Design System (MIV)'})).toHaveAttribute('aria-current','page');
  await page.getByRole('navigation',{name:'Seções do Design System'}).getByRole('link',{name:/02 Paleta mineral/}).click();
  await expect(page).toHaveURL(/#ds-2/);
  await page.getByRole('button',{name:'01 / Explorar Arquivo'}).click();
  await expect(page.locator('.nft-card')).toHaveCount(6);
  await page.goBack();await expect(page.locator('.ds-section')).toHaveCount(6);
});
test('DS 02 · contraste, cópia e ETH preservam valor e contexto',async({page,context,browserName})=>{
  if(browserName==='chromium')await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.goto('/design');await expect(page.locator('.ds-contrast-number')).toHaveText('15.10:1');
  await page.getByLabel('Cor do texto').selectOption('muted');await page.getByLabel('Cor do fundo').selectOption('plate');
  await expect(page.locator('.ds-contrast-number')).toHaveText('4.39:1');
  await expect(page.locator('.ds-pass-list').getByText('× AA · normal',{exact:true})).toBeVisible();
  await page.getByLabel('Formato de cópia').selectOption('HEX');await page.getByRole('button',{name:'Copiar --paper como HEX'}).click();
  await expect(page.getByRole('status').filter({hasText:'Copiado para'})).toBeVisible();
  if(browserName==='chromium')expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('#F0F1ED');
  const input=page.getByLabel('Valor exato em ETH');await input.fill('0.000000000000000001');
  await expect(page.locator('#ds-eth-hint')).toHaveText('1 Wei');await expect(page.locator('.ds-wei-table')).toContainText('0.000000000000000003 ETH');
  await input.fill('0.0000000000000000001');await expect(input).toHaveAttribute('aria-invalid','true');await expect(page.getByText('Use um decimal não negativo com até 18 casas.')).toBeVisible();
});
test('DS 03 · controles, validação e consentimento sem mutações no marketplace',async({page})=>{
  await page.goto('/design');await expect(page.locator('.ds-icons button')).toHaveCount(20);
  const mutations:string[]=[];page.on('request',req=>{if(req.url().includes('/api/')&&req.method()!=='GET')mutations.push(req.url());});
  await page.getByRole('button',{name:'Validar registro',exact:true}).click();await expect(page.locator('#ds-name')).toHaveAttribute('aria-invalid','true');
  await page.getByLabel('Nome do registro').fill('Estudo');await page.getByRole('button',{name:'Validar registro',exact:true}).click();await expect(page.locator('#ds-name')).toHaveAttribute('aria-invalid','false');
  await page.getByRole('button',{name:'Aumentar quantidade'}).click();await page.getByRole('button',{name:'Aumentar quantidade'}).click();
  await expect(page.locator('#ds-quantity')).toHaveText('3');await expect(page.getByRole('button',{name:'Aumentar quantidade'})).toBeDisabled();
  await page.getByRole('button',{name:/Única ERC-721/}).click();await expect(page.locator('#ds-quantity')).toHaveText('1');
  await page.getByRole('button',{name:'Simular nft.updated'}).click();const confirm=page.getByRole('button',{name:'Confirmar aquisição de demonstração'});
  await expect(confirm).toBeDisabled();await expect(page.locator('.stale-lock-banner')).toContainText('0.180000000000000002');
  await page.getByRole('button',{name:'Atualizar e aceitar nova cotação'}).click();await expect(confirm).toBeEnabled();
  await expect(page.locator('.ds-quote-price')).toHaveText('0.180000000000000002 ETH');await confirm.click();await expect(confirm).toBeDisabled();
  expect(mutations).toEqual([]);
});
test('DS 04 · estados, teclado, redução de movimento e geometria responsiva',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/design');await page.evaluate(()=>document.fonts.ready);
  const state=page.getByLabel('Estado em inspeção');
  for(const value of ['hover','active','focus-visible','disabled','loading','error/stale','default']){
    await state.selectOption(value);
    if(['disabled','loading','error/stale'].includes(value))await expect(page.locator('.ds-buttons-stack button').first()).toBeDisabled();
    else await expect(page.locator('.ds-buttons-stack button').first()).toBeEnabled();
  }
  await state.focus();await page.keyboard.press('Tab');await expect(page.locator('.ds-buttons-stack button').first()).toBeFocused();
  expect(await page.locator('.ds-buttons-stack button').first().evaluate(el=>getComputedStyle(el).outlineWidth)).toBe('3px');
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await page.locator('.skeleton-shimmer').first().evaluate(el=>getComputedStyle(el,'::after').animationName)).toBe('none');
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const over=await page.locator('.ds-workbench').evaluate(el=>[...el.querySelectorAll('*')].filter(n=>n.getBoundingClientRect().right>innerWidth+2&&!n.closest('.ds-table-scroll,.ds-code')).length);
    expect(over,`overflow at ${width}`).toBe(0);
  }
  expect(errors).toEqual([]);
});
test('DS 05 · exportação CSS e DTCG baixa arquivos canônicos',async({page})=>{
  await page.goto('/design');const cssDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSS'}).click();
  expect((await cssDownload).suggestedFilename()).toBe('kronos-tokens.css');
  await page.getByRole('button',{name:'DTCG JSON',exact:true}).click();const jsonDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar DTCG JSON'}).click();
  const json=await jsonDownload;expect(json.suggestedFilename()).toBe('kronos-design-tokens.dtcg.json');
  const file=await json.path();const tokens=JSON.parse(readFileSync(file!,'utf8'));expect(tokens.semantic.color.action.$value).toBe('{primitive.color.action}');
  await page.getByLabel('Buscar nos 114 tokens canônicos').fill('impossível-xyz');await expect(page.getByText('Nenhum token corresponde à busca.')).toBeVisible();
});
test('DS 06 · standalone file:// offline com fontes, ícones e playground',async({page,context})=>{
  await context.setOffline(true);const requests:string[]=[];page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.goto(pathToFileURL(resolve('kronos-design-system.html')).href);await expect(page.locator('.ds-section')).toHaveCount(6);
  await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.fonts.check('600 32px "Barlow Condensed"'))).toBe(true);
  await page.getByRole('button',{name:'Inverter',exact:true}).click();await expect(page.locator('.ds-symbol-board')).toHaveClass(/is-inverse/);
  await expect(page.locator('.ds-icons button')).toHaveCount(20);await page.getByRole('button',{name:'Simular nft.updated'}).click();await expect(page.locator('.stale-lock-banner')).toBeVisible();
  expect(requests).toEqual([]);
  await test.info().attach('standalone-offline',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
});
test('DS 07 · iframe de preview opera sem backend',async({page})=>{
  const html=readFileSync(resolve('kronos-design-system.html'),'utf8');
  await page.goto('about:blank');await page.setContent('<iframe title="Preview KRONOS" sandbox="allow-scripts allow-downloads" style="width:100%;height:850px;border:0"></iframe>');
  await page.locator('iframe').evaluate((el,src)=>(el as HTMLIFrameElement).srcdoc=src,html);
  const frame=page.frameLocator('iframe');await expect(frame.locator('.ds-section')).toHaveCount(6);
  await frame.getByRole('button',{name:'Grade on'}).click();await expect(frame.getByRole('button',{name:'Grade off'})).toBeVisible();
  await frame.getByLabel('Cor do texto').selectOption('ink');await expect(frame.locator('.ds-contrast-number')).toHaveText('15.10:1');
  await frame.locator('body').evaluate(()=>{Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true});document.execCommand=()=>{throw new DOMException('Clipboard blocked','SecurityError');};});
  await frame.getByRole('button',{name:'Copiar --paper como CSS'}).click();
  await expect(frame.getByRole('textbox',{name:'Texto para cópia manual'})).toHaveValue('var(--paper)');
});
