# Proposal

## Why

O colecionador precisa aplicar e remover um Cupom de desconto no Carrinho e ver imediatamente o impacto no subtotal, desconto, taxa de rede e total da Cotação oficial da API, com mensagens claras quando o código for inválido ou estiver expirado (README §3, "Carrinho").

## What Changes

- Aplicação de Cupom válido na Cotação do Carrinho, recalculando desconto e total como strings decimais em ETH.
- Tratamento distinto para Cupom expirado e Cupom inexistente/inválido, mantendo o subtotal e o total originais sem desconto.
- Remoção de Cupom ativo no Carrinho, restaurando o total sem desconto.
- Persistência do Cupom aplicado no Carrinho após refresh da página.

Fora desta change: Catálogo, Favoritos, Carteiras e criação do Pedido no checkout.

## Capabilities

### New Capabilities
- `carrinho/cupom`: aplicação, validação, remoção e persistência de Cupom na Cotação do Carrinho.

## Impact

- Contexto exclusivo: `src/carrinho/` (sem tocar em `src/catalogo/`).
- Contrato REST de Cotação (`POST /api/cart/coupon`, `DELETE /api/cart/coupon`, `GET /api/cart`).
- Testes automatizados de precisão ETH e E2E Playwright.
