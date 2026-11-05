import { test, expect, type Page } from '@playwright/test';

// Optional override targets a running Vite development server without changing the project config.
test.use({ baseURL: process.env.KRONOS_E2E_BASE_URL || 'http://localhost:5273' });

type ApiResult = { status: number; data: any };
async function api(page: Page, path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', headers: Record<string, string> = {}): Promise<ApiResult> {
  // Browser fetch is intentional: requests must traverse the application's MSW worker.
  return page.evaluate(async ({ path, body, method, headers }) => {
    const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  }, { path, body, method, headers });
}
async function open(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.loading-page')).toHaveCount(0, { timeout: 10000 });
}
async function login(page: Page, email = 'maya@kronos.archive', password = 'Kronos123!') {
  const form = page.getByRole('form', { name: 'Entrar e continuar' });
  await form.getByLabel('E-mail', { exact: true }).fill(email);
  await form.getByLabel('Senha', { exact: true }).fill(password);
  await form.getByRole('button', { name: 'Entrar e continuar', exact: true }).click();
}
async function scenario(page: Page, value: string) {
  await page.getByLabel('Cenário MSW').selectOption(value);
  await expect.poll(() => new URL(page.url()).searchParams.get('scenario') || 'normal').toBe(value);
}
async function checkout(page: Page) {
  await open(page, '/checkout');
  await expect(page.getByLabel('Nome do colecionador')).toBeVisible();
  await page.getByRole('checkbox', { name: /Revisei os itens/ }).check();
}
const confirm = (page: Page) => page.getByRole('button', { name: /Confirmar & Liquidar/ });
const receipt = (page: Page) => page.getByRole('heading', { name: /AQUISIÇÃO CONFIRMADA NO ARQUIVO/ });
async function snapshot(page: Page, name: string) {
  await test.info().attach(name, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
}

test.describe('KRONOS // ARCHIVE — 12 cenários do desafio', () => {
  test.beforeEach(async ({ page }) => {
    // Playwright creates a fresh browser context and localStorage for every test.
    await open(page);
    await expect(page.locator('.nft-card')).toHaveCount(6);
  });

  test('01. Busca, filtros combinados, ordenação, paginação e histórico', async ({ page }) => {
    await snapshot(page, 'inicio');
    await page.getByRole('button', { name: 'Próxima página' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator('.nft-card').first()).toContainText('K—007');
    await page.getByLabel('Filtrar por categoria').selectOption('generative');
    await expect(page).toHaveURL(/page=1/);
    await page.getByLabel('Filtrar por padrão').selectOption('ERC-721');
    await page.getByLabel('Somente disponíveis').check();
    await page.getByLabel('Ordenar obras').selectOption('price_asc');
    await expect(page.locator('.nft-card')).toHaveCount(4);
    await expect(page.locator('.nft-card').first()).toContainText('Field notes 004');
    await page.getByRole('searchbox', { name: 'Buscar obras' }).fill('Phase shift');
    await expect(page.locator('.nft-card')).toHaveCount(1);
    await page.reload();
    await expect(page.getByRole('searchbox')).toHaveValue('Phase shift');
    await expect(page.locator('.nft-card')).toHaveCount(1);
    await page.goBack();
    await expect(page.getByRole('searchbox')).toHaveValue('');
    await expect(page.locator('.nft-card')).toHaveCount(4);
    await page.goForward();
    await expect(page.getByRole('searchbox')).toHaveValue('Phase shift');
    await page.getByRole('searchbox').fill('obra inexistente');
    await expect(page.getByRole('heading', { name: /Nenhuma obra encontrada/ })).toBeVisible();
    await page.getByRole('button', { name: 'Restaurar Catálogo Completo' }).click();
    await expect(page.locator('.nft-card')).toHaveCount(6);
  });

  test('02. Detalhe direto, edições, quantidade, 404, compatibilidade legada e mint', async ({ page }) => {
    await open(page, '/nfts/k-001');
    await expect(page.getByRole('heading', { name: 'Phase shift 001', exact: true })).toBeVisible();
    await snapshot(page, 'detalhe');
    await page.getByRole('button', { name: /Estudo de Artista · ERC-1155/ }).click();
    await page.getByRole('button', { name: '+', exact: true }).click();
    await page.getByRole('button', { name: '+', exact: true }).click();
    await expect(page.getByRole('button', { name: '+', exact: true })).toBeDisabled();
    await open(page, '/nfts/k-012');
    await expect(page.getByRole('button', { name: /Adicionar ao Cofre/ })).toBeDisabled();
    await open(page, '/nfts/inexistente');
    await expect(page.getByRole('heading', { name: 'Obra não encontrada.' })).toBeVisible();
    await open(page, '/caminho-inexistente');
    await expect(page.getByRole('heading', { name: 'Página não encontrada.' })).toBeVisible();
    await open(page, '/?view=mint');
    await expect(page).toHaveURL(/\/mint/);
    await page.getByRole('button', { name: /Assinar Voucher EIP-712/ }).click();
    await expect(page).toHaveURL(/\/nfts\/k-013/);
    await expect(page.getByRole('heading', { name: 'Isochronic Resonance #07', exact: true })).toBeVisible();
    const { data } = await api(page, '/nfts/k-013');
    expect(data.nft.sha256Hash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.nft.editions[0].totalSupply).toBe(1);
  });

  test('03. Cadastro, conflito 409, login, expiração, logout e troca de conta', async ({ page }) => {
    await api(page, '/auth/logout', {});
    await api(page, '/cart/items', { nftId: 'k-004', editionId: 'study', quantity: 2, mode: 'add' }, 'PUT');
    await open(page, '/register');
    const form = page.getByRole('form', { name: 'Criar minha conta' });
    await form.getByLabel('Nome', { exact: true }).fill('Ari Archive');
    await form.getByLabel(/Handle/).fill('@ari.archive');
    await form.getByLabel('E-mail', { exact: true }).fill('maya@kronos.archive');
    await form.getByLabel('Senha', { exact: true }).fill('Archive123!');
    await form.getByLabel('Confirmar senha', { exact: true }).fill('Archive123!');
    await form.getByRole('button', { name: 'Criar minha conta' }).click();
    await expect(form.getByRole('alert')).toContainText('e-mail já');
    await form.getByLabel('E-mail', { exact: true }).fill('ari@example.test');
    await form.getByRole('button', { name: 'Criar minha conta' }).click();
    await expect(page).toHaveURL(/\/account/);
    expect((await api(page, '/cart')).data.quote.items[0].quantity).toBe(2);
    await scenario(page, 'session-expired');
    await expect(page).toHaveURL(/\/login/);
    await login(page, 'ari@example.test', 'Archive123!');
    await expect(page).toHaveURL(/\/account/);
    await page.locator('.demo-controls summary').click();
    await page.getByRole('button', { name: /Fazer Logout/ }).click();
    await expect(page.getByRole('heading', { name: 'Entre para acessar seu acervo.' })).toBeVisible();
    await page.getByRole('button', { name: 'Entrar na conta', exact: true }).click();
    await login(page, 'ari@example.test', 'wrong-password');
    await expect(page.getByRole('alert')).toContainText('incorretos');
    await login(page, 'ari@example.test', 'Archive123!');
    await expect(page).toHaveURL(/\/account/);
    await page.locator('.demo-controls summary').click();
    await page.getByRole('button', { name: /Theo Void/ }).click();
    await expect(page.locator('.profile-heading')).toContainText('@theo.archive');
    await expect(page.locator('main')).not.toContainText('Ari Archive');
    await page.reload();
    await expect(page.locator('.profile-heading')).toContainText('@theo.archive');
  });

  test('04. Favorito otimista, rollback de HTTP 500 e persistência', async ({ page }) => {
    const favorite = page.getByRole('button', { name: 'Favoritar Phase shift 001', exact: true });
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');
    await scenario(page, 'fav-500');
    await favorite.click();
    await expect(page.locator('.toast')).toContainText('rollback');
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');
    await scenario(page, 'normal');
    const favResp = page.waitForResponse(r => r.url().includes('/api/favorites/k-001') && r.status() === 200);
    await favorite.click();
    await favResp;
    await expect(favorite).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    await expect(favorite).toHaveAttribute('aria-pressed', 'false');
    await open(page, '/nfts/k-001');
    await page.getByRole('button', { name: 'Favoritar Phase shift 001', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Favoritar Phase shift 001', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  test('05. Carrinho, quantidades, remoção, cupom e persistência após refresh/login', async ({ page }) => {
    await open(page, '/cart');
    await snapshot(page, 'carrinho');
    await page.getByRole('button', { name: 'Aumentar quantidade de Phase shift 001' }).click();
    await expect(page.locator('.stepper output')).toHaveText('2');
    await page.getByLabel('Cupom de desconto').fill('EXPIRED50');
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await expect(page.locator('.toast')).toContainText('expirado');
    await page.getByLabel('Cupom de desconto').fill('INVALIDO');
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await expect(page.locator('.toast')).toContainText('inválido');
    await page.getByLabel('Cupom de desconto').fill('ARCHIVE20');
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await expect(page.locator('main')).toContainText('Desconto Cupom (ARCHIVE20)');
    await page.getByRole('button', { name: 'Remover cupom' }).click();
    await expect(page.locator('main')).toContainText('Desconto Cupom (Nenhum)');
    await page.reload();
    await expect(page.locator('.stepper output')).toHaveText('2');
    await page.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Cofre de Aquisição está vazio/ })).toBeVisible();
    await api(page, '/auth/logout', {});
    await api(page, '/cart/items', { nftId: 'k-004', editionId: 'study', quantity: 2, mode: 'add' }, 'PUT');
    await open(page, '/checkout');
    await expect(page).toHaveURL(/\/login/);
    await login(page);
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.locator('.quote-summary-card')).toContainText('2× Field notes 004');
  });

  test('06. Compra completa, do catálogo ao recibo confirmado e imutável', async ({ page }) => {
    await page.getByRole('button', { name: /Inspecionar Lote/ }).click();
    await page.getByRole('button', { name: /Estudo de Artista · ERC-1155/ }).click();
    await page.getByRole('button', { name: /Adquirir Agora/ }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(confirm(page)).toBeDisabled();
    await snapshot(page, 'pagamento');
    await page.getByRole('checkbox', { name: /Revisei os itens/ }).check();
    await confirm(page).click();
    await expect(receipt(page)).toBeVisible();
    const orders = (await api(page, '/orders')).data.orders;
    expect(orders).toHaveLength(1); expect(orders[0].status).toBe('CONFIRMED');
    expect((await api(page, '/cart')).data.quote.items).toHaveLength(0);
    const originalTotal = orders[0].totalEth;
    await api(page, '/__mock/ws-emit', { nftId: 'k-001', editionId: 'study', newPriceEth: '9.000000000000000000', newAvailableSupply: 8, version: 20 });
    expect((await api(page, `/orders/${orders[0].orderId}`)).data.order.totalEth).toBe(originalTotal);
    await page.getByRole('button', { name: /Testar Reenvio/ }).click();
    await expect(page.locator('.toast')).toContainText('IDEMPOTÊNCIA');
    expect((await api(page, '/orders')).data.orders).toHaveLength(1);
  });

  test('07. Recusa, cliques repetidos e timeout recuperam a mesma tentativa', async ({ page }) => {
    await checkout(page);
    await page.getByRole('button', { name: 'Simular Pagamento Recusado' }).click();
    await expect(page.getByRole('heading', { name: /PAGAMENTO RECUSADO/ })).toBeVisible();
    expect((await api(page, '/cart')).data.quote.items).toHaveLength(1);
    await page.getByRole('button', { name: 'Iniciar nova aquisição' }).click();
    await scenario(page, 'timeout-order');
    await page.getByRole('checkbox', { name: /Revisei os itens/ }).check();
    // Losing the WebSocket forces recovery through the persisted Idempotency-Key.
    await page.evaluate(async () => { const module = await import('/src/lib/socket-client.ts'); module.socketInstance?.disconnect(); });
    const timedOut = page.waitForResponse(r => r.url().endsWith('/api/orders') && r.request().method() === 'POST' && r.status() === 504);
    await confirm(page).click();
    await timedOut;
    await page.reload();
    await expect(receipt(page)).toBeVisible();
    const orders = (await api(page, '/orders')).data.orders;
    expect(orders).toHaveLength(2); expect(orders.filter((o: any) => o.status === 'CONFIRMED')).toHaveLength(1);
    await page.reload();
    await expect(receipt(page)).toBeVisible();
    expect((await api(page, '/orders')).data.orders).toHaveLength(2);
  });

  test('08. Perfil, avatar, senha e CRUD de carteiras com validação', async ({ page }) => {
    await open(page, '/account');
    const profile = page.getByRole('form', { name: 'Salvar perfil' });
    await profile.getByLabel('Nome', { exact: true }).fill('Maya Archive');
    await profile.getByLabel('E-mail', { exact: true }).fill('theo@kronos.archive');
    await profile.getByRole('button', { name: 'Salvar perfil' }).click();
    await expect(profile.getByRole('alert')).toContainText('já');
    await profile.getByLabel('E-mail', { exact: true }).fill('maya@kronos.archive');
    await profile.getByLabel(/Avatar ·/).setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64') });
    await profile.getByRole('button', { name: 'Salvar perfil' }).click();
    await expect(page.locator('.profile-heading')).toContainText('Maya Archive');
    await expect(page.getByRole('img', { name: 'Avatar de Maya Archive' })).toBeVisible();
    const password = page.getByRole('form', { name: 'Atualizar senha' });
    await password.getByLabel('Senha atual', { exact: true }).fill('wrong');
    await password.getByLabel('Nova senha', { exact: true }).fill('Archive456!');
    await password.getByLabel('Confirmar nova senha', { exact: true }).fill('Archive456!');
    await password.getByRole('button', { name: 'Atualizar senha' }).click();
    await expect(password.getByRole('alert')).toContainText('incorreta');
    await password.getByLabel('Senha atual', { exact: true }).fill('Kronos123!');
    await password.getByRole('button', { name: 'Atualizar senha' }).click();
    await expect(page.locator('.toast')).toContainText('Senha atualizada');
    const wallet = page.getByRole('form', { name: 'Cadastrar carteira', exact: true });
    await wallet.getByLabel('Nome da carteira').fill('Zora Vault');
    await wallet.getByLabel('Endereço EVM').fill('invalid');
    await wallet.getByRole('button', { name: 'Cadastrar carteira' }).click();
    await expect(wallet.getByRole('alert')).toContainText('endereço EVM');
    await wallet.getByLabel('Endereço EVM').fill(`0x${'a'.repeat(40)}`);
    await wallet.getByLabel('Rede', { exact: true }).selectOption('zora-network');
    await wallet.getByLabel('Estado da conexão').selectOption('REFUSED');
    await wallet.getByLabel('Carteira principal', { exact: true }).check();
    await wallet.getByRole('button', { name: 'Cadastrar carteira' }).click();
    const editor = page.locator('.wallet-editor').filter({ has: page.locator('summary', { hasText: 'Zora Vault' }) });
    await expect(editor.locator('summary')).toContainText('Principal · REFUSED');
    await editor.locator('summary').click();
    await editor.getByLabel('Rede', { exact: true }).selectOption('arbitrum-one');
    await editor.getByLabel('Estado da conexão').selectOption('DISCONNECTED');
    await editor.getByRole('button', { name: 'Salvar carteira' }).click();
    await expect(editor.locator('summary')).toContainText('DISCONNECTED');
    await editor.getByLabel('Estado da conexão').selectOption('CONNECTED');
    await editor.getByRole('button', { name: 'Salvar carteira' }).click();
    await expect(editor.locator('summary')).toContainText('CONNECTED');
    await page.reload();
    await expect(page.getByRole('img', { name: 'Avatar de Maya Archive' })).toBeVisible();
    await page.locator('.wallet-editor').filter({ has: page.locator('summary', { hasText: 'Zora Vault' }) }).locator('summary').click();
    await page.locator('.wallet-editor').filter({ has: page.locator('summary', { hasText: 'Zora Vault' }) }).getByRole('button', { name: 'Excluir carteira' }).click();
    await expect(page.locator('main')).not.toContainText('Zora Vault');
    await api(page, '/auth/logout', {}); await open(page, '/login'); await login(page, 'maya@kronos.archive', 'Archive456!');
    await expect(page).toHaveURL(/\/account/);
    expect(await page.evaluate(() => localStorage.getItem('kronos.modular-db.v2'))).not.toContain('Archive456!');
  });

  test('09. WebSocket real atualiza preço/estoque e bloqueia checkout desatualizado', async ({ page }) => {
    await checkout(page);
    await expect(page.locator('.ws-pill')).toContainText('CONECTADO · MSW WEBSOCKET');
    await page.evaluate(async () => {
      const { socketInstance } = await import('/src/lib/socket-client.ts');
      (window as any).__kronosWireEvents = [];
      socketInstance?.on('nft.updated', event => (window as any).__kronosWireEvents.push(event));
    });
    await page.getByRole('button', { name: /Simular Mudança de Preço/ }).click();
    await expect(page.getByRole('alert')).toContainText('STALE_QUOTE');
    await expect(confirm(page)).toBeDisabled();
    expect(await page.evaluate(() => (window as any).__kronosWireEvents.length)).toBeGreaterThan(0);
    await page.getByRole('button', { name: /Atualizar e Aceitar Nova Cotação/ }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('checkbox', { name: /Revisei os itens/ }).check();
    await expect(confirm(page)).toBeEnabled();
    const quote = (await api(page, '/cart')).data.quote;
    await api(page, '/__mock/ws-emit', { nftId: 'k-001', editionId: 'study', newPriceEth: '0.200000000000000001', newAvailableSupply: 0, version: quote.items[0].nftVersion + 1 });
    await expect(page.getByRole('alert')).toContainText('EDITION_SOLD_OUT');
    await expect(confirm(page)).toBeDisabled();
  });

  test('10. Eventos antigos/duplicados, desconexão e retomada de pedido pendente', async ({ page }) => {
    const event = { nftId: 'k-001', editionId: 'study', newPriceEth: '0.220000000000000001', newAvailableSupply: 10, version: 3, eventId: 'stable-event-10' };
    expect((await api(page, '/__mock/ws-emit', event)).data.applied).toBe(true);
    expect((await api(page, '/__mock/ws-emit', event)).data.applied).toBe(false);
    expect((await api(page, '/__mock/ws-emit', { ...event, eventId: 'old-event-10', version: 2, newPriceEth: '9.0' })).data.applied).toBe(false);
    await api(page, '/quotes/revalidate', {});
    await checkout(page);
    await confirm(page).click();
    await expect(page.getByRole('heading', { name: 'Pedido pendente.', exact: true })).toBeVisible();
    await page.evaluate(async () => { const module = await import('/src/lib/socket-client.ts'); module.socketInstance?.disconnect(); });
    await page.reload();
    await expect(receipt(page)).toBeVisible();
    const orders = (await api(page, '/orders')).data.orders;
    expect(orders).toHaveLength(1); expect(orders[0].status).toBe('CONFIRMED');
    await expect(page.locator('.ws-pill')).toContainText('CONECTADO · MSW WEBSOCKET');
  });

  test('11. Teclado, foco visível, validação de formulários e responsividade', async ({ page }) => {
    await page.evaluate(() => { document.body.setAttribute('tabindex', '-1'); document.body.focus(); });
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    await open(page, '/register');
    await page.getByRole('button', { name: 'Criar minha conta' }).click();
    await expect(page.getByLabel('Nome', { exact: true })).toBeFocused();
    expect(await page.getByLabel('Nome', { exact: true }).evaluate((e: HTMLInputElement) => e.validity.valueMissing)).toBe(true);
    for (const path of ['/', '/nfts/k-001', '/cart', '/checkout', '/account']) {
      await open(page, path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  });

  test('12. Skeletons com latência, erro HTTP, retry e retorno ao checkout após expiração', async ({ page }) => {
    await scenario(page, 'latency');
    await expect(page.locator('.skeleton-shimmer').first()).toBeVisible();
    await expect(page.locator('.nft-card')).toHaveCount(6);
    await scenario(page, 'http-500');
    await expect(page.getByRole('alert')).toContainText('Falha transitória');
    const response = page.waitForResponse(r => r.url().includes('/api/nfts') && r.status() === 500);
    await page.getByRole('button', { name: 'Tentar Novamente' }).click();
    await response;
    await scenario(page, 'normal');
    await expect(page.locator('.nft-card')).toHaveCount(6);
    await checkout(page);
    await scenario(page, 'session-expired');
    await expect(page).toHaveURL(/\/login/);
    await login(page);
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.locator('.quote-summary-card')).toContainText('Phase shift 001');
  });
});
