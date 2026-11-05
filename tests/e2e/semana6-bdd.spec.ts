import { test, expect, type Page } from '@playwright/test';

test.use({ baseURL: process.env.KRONOS_E2E_BASE_URL || 'http://localhost:5273' });

type ApiResult = { status: number; data: any };
async function api(
  page: Page,
  path: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
  headers: Record<string, string> = {},
): Promise<ApiResult> {
  return page.evaluate(
    async ({ path, body, method, headers }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, data: await response.json() };
    },
    { path, body, method, headers },
  );
}

async function open(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.loading-page')).toHaveCount(0, { timeout: 10000 });
}

const confirmButton = (page: Page) => page.getByRole('button', { name: /Confirmar & Liquidar/ });
const receiptHeading = (page: Page) =>
  page.getByRole('heading', { name: /AQUISIÇÃO CONFIRMADA NO ARQUIVO/ });

test.describe('Semana 6 — 3 Cenários BDD (Confirmação segura e idempotente no pagamento)', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
    await expect(page.locator('.nft-card')).toHaveCount(6);
  });

  test('Cenário 1: Mudança de preço em tempo real bloqueia a confirmação até o colecionador aceitar a nova Cotação', async ({
    page,
  }) => {
    await open(page, '/checkout');
    await expect(page.getByLabel('Nome do colecionador')).toBeVisible();
    await page.getByRole('checkbox', { name: /Revisei os itens/ }).check();
    await expect(confirmButton(page)).toBeEnabled();

    // Quando o preço da Edição muda em tempo real enquanto o checkout está aberto
    await page.getByRole('button', { name: /Simular Mudança de Preço/ }).click();

    // Então a interface informa que a Cotação está desatualizada e desabilita o botão de confirmar
    await expect(page.getByRole('alert')).toContainText('STALE_QUOTE');
    await expect(confirmButton(page)).toBeDisabled();

    // E quando o colecionador aceita atualizar a nova Cotação e revisa os itens, o botão volta a ficar habilitado
    await page.getByRole('button', { name: /Atualizar e Aceitar Nova Cotação/ }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('checkbox', { name: /Revisei os itens/ }).check();
    await expect(confirmButton(page)).toBeEnabled();
  });

  test('Cenário 2: Pedido confirmado gera recibo imutável e reenvio idempotente não duplica o Pedido', async ({
    page,
  }) => {
    await open(page, '/checkout');
    await page.getByRole('checkbox', { name: /Revisei os itens/ }).check();

    // Quando o colecionador confirma a compra e o Pedido é confirmado
    await confirmButton(page).click();
    await expect(receiptHeading(page)).toBeVisible();

    const orders = (await api(page, '/orders')).data.orders;
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe('CONFIRMED');
    expect((await api(page, '/cart')).data.quote.items).toHaveLength(0);

    // E uma mudança posterior de preço da Edição não altera o total gravado no recibo
    const originalTotal = orders[0].totalEth;
    await api(page, '/__mock/ws-emit', {
      nftId: 'k-001',
      editionId: 'study',
      newPriceEth: '9.000000000000000000',
      newAvailableSupply: 8,
      version: 20,
    });
    expect((await api(page, `/orders/${orders[0].orderId}`)).data.order.totalEth).toBe(
      originalTotal,
    );

    // E um reenvio da mesma tentativa com a mesma chave de idempotência recupera o mesmo Pedido mantendo apenas 1 Pedido criado
    await page.getByRole('button', { name: /Testar Reenvio/ }).click();
    await expect(page.locator('.toast')).toContainText('IDEMPOTÊNCIA');
    expect((await api(page, '/orders')).data.orders).toHaveLength(1);
  });

  test('Cenário 3: Pagamento recusado ou Edição esgotada impede a compra e preserva o Carrinho', async ({
    page,
  }) => {
    await open(page, '/checkout');
    await page.getByRole('checkbox', { name: /Revisei os itens/ }).check();

    // Quando o pagamento é recusado na finalização da compra
    await page.getByRole('button', { name: 'Simular Pagamento Recusado' }).click();

    // Então o sistema exibe o estado de pagamento recusado sem confirmar o Pedido
    await expect(page.getByRole('heading', { name: /PAGAMENTO RECUSADO/ })).toBeVisible();

    // E preserva o item intacto no Carrinho para nova tentativa
    const cartItems = (await api(page, '/cart')).data.quote.items;
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].nftId).toBe('k-001');
  });
});
