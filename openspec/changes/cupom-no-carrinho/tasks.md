# Tasks

## 1. Domínio e Cotação em ETH (`src/carrinho/`)

- [x] 1.1 Garantir cálculo do desconto percentual em `BigInt` Wei sem ponto flutuante e retorno de `subtotalEth`, `discountEth`, `networkFeeEth` e `totalEth` como strings decimais de 18 casas.
- [x] 1.2 Validar nos handlers MSW os códigos `ARCHIVE20` (20% válido), `EXPIRED50` (422 expirado) e códigos desconhecidos (404/422 inválido).

## 2. Interface do Carrinho e Persistência

- [x] 2.1 Conectar formulário de aplicar/remover Cupom no Carrinho à Cotação da API e exibir feedback acessível para código expirado ou inválido.
- [x] 2.2 Preservar o Cupom ativo após refresh e sincronizar com os testes E2E do Playwright (`tests/e2e/marketplace.spec.ts`).
