# KRONOS // ARCHIVE

Marketplace de arte digital em React 18 e TypeScript, com a identidade mineral definida em `DESIGN.md` e `MIV-OFICIAL.md`. Catálogo, conta, carteiras, mint e pagamentos usam uma API simulada com MSW no navegador.

**Demonstração:** os pagamentos Stripe/PIX, saldos Web3, endereços, assinaturas e referências de transação são fictícios. Não há cobrança, conexão a uma carteira externa, publicação no IPFS ou cunhagem em blockchain.

## Execução local

Requisitos: Node.js 20+ e npm. Execute na raiz do repositório:

```powershell
npm ci
npx playwright install chromium
npm run dev
```

Abra `http://localhost:5173`. O MSW inicia antes do React e fica disponível também no build de demonstração. A persistência é local a cada origem e navegador. Nenhum backend privado ou segredo é necessário; não há variáveis de ambiente obrigatórias.

```powershell
npm test
npm run typecheck
npm run build
npm run preview
npm run test:e2e
npx playwright show-report
```

O Playwright inicia/reutiliza o servidor de desenvolvimento configurado em `playwright.config.ts`. Para apontar os testes a outro servidor **de desenvolvimento já em execução**, defina `KRONOS_E2E_BASE_URL`; os testes de interrupção inspecionam o módulo do socket servido pelo Vite.

## Rotas e estado da URL

| Rota | Função |
| --- | --- |
| `/` | Catálogo de 12 obras, seis por página |
| `/nfts/k-001` | Detalhe direto, edição, quantidade e favoritos |
| `/mint` | Estúdio de criação de arte generativa |
| `/cart` | Carrinho, quantidades, cupom e cotação |
| `/checkout` | Revisão, identificação, carteira e envio protegido |
| `/account` | Entrada da conta, perfil, senha, carteiras e recibos |
| `/login`, `/register` | Autenticação e cadastro com validação |
| `/design` | MIV e Design System interativo, com 114 tokens e 20 ícones |
| Qualquer outro caminho | Página 404 |

TanStack Router valida `q`, `category`, `standard`, `sort`, `available`, `page` e `view`, além dos parâmetros auxiliares de demonstração/retorno. Busca, filtros combinados, ordenação e página ficam na URL e sobrevivem ao refresh e ao histórico. `/?view=mint`, `/?view=cart` e demais telas antigas são redirecionadas; `/?nft=k-001` abre o detalhe semântico.

## Design System / MIV em uso

A aba **06 / Design System (MIV)** abre `/design`; `/?view=design` também funciona. A documentação técnica está em [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), e o intercâmbio de tokens em [design-tokens.dtcg.json](src/styles/design-tokens.dtcg.json). O workbench oferece contraste AA/AAA, cópia CSS/HEX/OKLCH, tipografia editável, precisão de Wei, inspetor de molduras, estados de componentes e exportação CSS/JSON.

[kronos-design-system.html](kronos-design-system.html) é a mesma página empacotada para abrir sem servidor, com fontes e licenças incorporadas. Funciona offline e em iframe que permita scripts; downloads dependem da permissão do host. `npm run ds:sync` sincroniza tokens, inventário do manual e ícones; `npm run ds:standalone` gera o HTML. O build executa essa geração automaticamente.

Para testar em máquinas com pouca memória, execute em sequência. `KRONOS_E2E_LOW_MEMORY=1` ativa opções de Chromium com menor consumo, mantendo os mesmos testes. Evidências e limites: [docs/DESIGN-SYSTEM-VALIDATION.md](docs/DESIGN-SYSTEM-VALIDATION.md).

## Contas fictícias

A demonstração começa autenticada como Maya. Ambas as contas aceitam a senha inicial **`Kronos123!`**:

| Conta | E-mail | Handle |
| --- | --- | --- |
| Maya Lin | `maya@kronos.archive` | `@maya.collector` |
| Theo Void | `theo@kronos.archive` | `@theo.archive` |

Em `/account`, abra **Contas e controles de demonstração** para usar o quick-switch, sair ou restaurar o banco. Também é possível cadastrar uma conta e entrar por e-mail/senha. Use dados fictícios.

As senhas cadastradas são derivadas com PBKDF2/SHA-256, salt aleatório e 100.000 iterações. A API não devolve hashes. Os hashes ficam separados do perfil; a senha em claro não é persistida.

O carrinho do visitante é mesclado ao da conta ao autenticar, respeitando os limites da edição. A troca de conta cancela consultas, limpa o cache privado e recria o transporte da sessão. Perfil, avatar, senha, favoritos, carteiras e pedidos são persistidos em `localStorage`.

## Cenários reproduzíveis

Selecione **Cenário MSW** na barra superior ou abra `/?scenario=...`:

| Cenário | Comportamento |
| --- | --- |
| `normal` | Respostas habituais |
| `latency` | 650 ms adicionais; skeletons com shimmer |
| `http-500` | Falha no catálogo; **Tentar Novamente** repete a consulta |
| `fav-500` | Falha de favorito com rollback otimista |
| `session-expired` | Uma expiração 401 por ativação; login preserva o destino anterior |
| `timeout-order` | A resposta de criação se perde; a tentativa é recuperável pela mesma chave |

Para recuperar uma falha de catálogo, volte para `normal`; repetir enquanto `http-500` estiver ativo continua falhando deliberadamente. A telemetria mostra o estado observado do Socket.IO; em ambiente sem WebSocket, a reconciliação usa REST.

No carrinho/checkout, **Simular Mudança de Preço** dispara `nft.updated` pelo MSW WebSocket e pelo `socket.io-client`. O checkout fica bloqueado até aceitar a nova cotação e revisar os valores novamente.

Para comprar: selecione uma carteira, confira nome/e-mail, escolha o pagamento e marque **Revisei os itens, as taxas e o total desta cotação**. O pedido começa pendente e chega a confirmado ou recusado pela camada de simulação. Uma tentativa persistida pode ser recuperada após refresh sem criar outro pedido. **Iniciar nova aquisição** abre uma nova tentativa.

Em `/account`, cada carteira permite editar a rede (`ethereum-mainnet`, `base-mainnet`, `arbitrum-one`, `zora-network`), definir a principal e simular `CONNECTED`, `DISCONNECTED` ou `REFUSED`. Carteiras desconectadas/recusadas bloqueiam pagamento via Web3.

Cupons: `KRONOS10` e `ARCHIVE20` são válidos; `EXPIRED50` retorna erro de expiração; outros códigos retornam cupom inválido. Há também remoção do cupom.

**Reset:** `/account` → controles de demonstração → **Resetar Banco MSW** restaura o banco determinístico. Tentativas de checkout persistidas separadamente também podem ser encerradas com **Iniciar nova aquisição**. Para um ambiente completamente novo, use um contexto anônimo ou limpe os dados desta origem.

## Testes e evidências

- `tests/unit/eth-and-engine.test.cjs`: 12 testes que importam os módulos TypeScript atuais de negócio por compilação em memória; não dependem do motor JavaScript legado.
- `tests/unit/design-system.test.cjs`: três verificações de contraste, estrutura DTCG, geometria e sincronização dos artefatos; `npm test` executa os 15 testes.
- `tests/e2e/marketplace.spec.ts`: 12 cenários executados em Chromium desktop (1440 px) e mobile (390 px), totalizando 24 casos.
- `tests/e2e/design-system.spec.ts`: sete cenários nas mesmas duas configurações, incluindo HTML offline e iframe; a suíte completa contém 38 casos.
- As chamadas auxiliares REST dos E2E usam `fetch` dentro da página para atravessar o worker MSW. Os testes de tempo real observam o cliente Socket.IO real.
- Capturas de início, detalhe, carrinho e pagamento são anexadas ao relatório HTML. Não equivalem a uma suíte de regressão visual com baselines aprovadas.
- Traces e screenshots de falha ficam em `test-results/`; o relatório fica em `playwright-report/`.

## Documentação e limites

- [Arquitetura implementada](docs/ARCHITECTURE.md)
- [Relatório executivo](CODEX_6_1_SOL_REPORT.md)
- [Direção visual](DESIGN.md) e [MIV](MIV-OFICIAL.md)
- [Especificação estendida](SPEC-KRONOS-MARKETPLACE-E2E.md)
- [Enunciado original](https://github.com/oliviasmim/frontend-challenge)

Esta implementação preserva CSS autoral e a identidade KRONOS. Isso diverge do Figma e da exigência original de Tailwind/shadcn; não constitui comprovação de aderência integral à stack do edital. Lighthouse, baselines visuais aprovadas, publicação e verificação de uma URL pública não fazem parte da validação local registrada nesta etapa.
