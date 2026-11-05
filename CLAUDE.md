# CLAUDE.md — Regras de Engenharia e Contexto para Agentes de IA (KRONOS // ARCHIVE)

Este repositório implementa o **KRONOS // ARCHIVE — NFT Marketplace**, entregável oficial do desafio Frontend (`oliviasmim/frontend-challenge`). Qualquer agente de IA (Claude Code, Codex, Cursor, Hermes) trabalhando neste projeto deve obedecer às regras abaixo:

## 1. Regras Inegociáveis (Critérios Eliminatórios do Edital)
1. **PROIBIDO MOCKAR NA UI:** Nunca coloque arrays estáticos, `setTimeout` simulando rede ou respostas falsas dentro de componentes React (`src/features/**`) ou no cliente Axios (`src/lib/api-client.ts`). Toda simulação pertence exclusivamente a `src/mocks/**` (MSW + Socket.IO).
2. **PRECISÃO ETH EM STRING / BIGINT WEI:** Nunca use `Number`, `parseFloat` ou operadores `+ / *` de ponto flutuante para calcular valores em ETH. Use sempre `parseEthToWei` e `formatWeiToEth` de `src/lib/eth-math.ts`.
3. **ISOLAMENTO DE SESSÃO NO LOGOUT / TROCA DE USUÁRIO:** Ao deslogar ou trocar de usuário, sempre chame `purgeSessionCache()` (`queryClient.clear()`) para garantir que nenhum dado privado vaze entre sessões.
4. **SENHAS NUNCA EM TEXTO CLARO:** Mesmo no banco simulado do MSW (`localStorage`), armazene apenas `passwordHash` (nunca a string da senha em aberto).
5. **IDEMPOTÊNCIA OBRIGATÓRIA NO CHECKOUT:** Toda chamada `POST /api/orders` deve enviar o header `Idempotency-Key`. A mesma chave com o mesmo payload retorna o pedido existente (`200`); a mesma chave com payload diferente retorna `409 IDEMPOTENCY_CONFLICT`.
6. **COTAÇÃO VENCIDA BLOQUEIA COMPRA:** Se um evento `nft.updated` alterar preço ou estoque de item no carrinho/checkout, o botão de confirmar compra deve ficar `disabled` até que o usuário clique em revalidar cotação.

## 2. Regras do Sistema de Design (MIV KRONOS // ARCHIVE)
- **Paleta 60-30-10:**
  - `--paper: #F0F1ED` (Papel de Arquivo — 60% campo principal)
  - `--plate: #DDE1DE` (Cinza de Placa — superfícies secundárias e skeletons)
  - `--ink: #161D1B` (Grafite Mineral — 30% tinta, bordas estruturais e badges `v:N`)
  - `--action: #2F4DEB` (Cobalto de Ação — $\le 10\%$, exclusivo para CTAs primários e `:focus-visible`)
  - `--error: #9E2E24` (Óxido de Alerta — exclusivo para `STALE_QUOTE` e erros)
- **Tipografia:** `Barlow Condensed` (títulos/display), `Manrope` (UI/leitura) e `IBM Plex Mono` com `tabular-nums` (valores ETH, códigos `// K—NNN`, versões `v:N` e hashes).
- **Geometria:** Molduras de obras usam `.art-frame.cut` (borda `1px solid #161D1B`, `8px` de respiro, raio `0px` e chanfro diagonal de `12px` no canto superior direito). Controles funcionais usam raios concêntricos (`14px` externo = `6px` interno + `8px` padding).

## 3. Comandos Oficiais do Projeto
- `npm run dev` — Inicia servidor Vite com MSW Service Worker e Socket.IO ativos.
- `npm run typecheck` — Verifica tipagem estrita TypeScript (`tsc --noEmit`).
- `npm run build` — Gera bundle otimizado de produção em `dist/`.
- `npm test` — Executa a suíte de testes unitários e de contrato do motor (`node tests/unit/eth-and-engine.test.cjs`).
- `npm run test:e2e` — Executa os testes E2E no Playwright.
