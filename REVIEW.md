# REVIEW — Semanas 5 e 6 (Glossário, Spec e Fluxo RPI em 3 Sessões)

## 1. O que eu pedi na Sessão 2 (Plan)

Em uma sessão limpa de agente (sem o histórico da conversa da Sessão 1), forneci exclusivamente:
1. O conteúdo integral do `RESEARCH.md` (contendo a dor do colecionador no pagamento e as falas reconstruídas `R1` a `R5` ancoradas no `README.md`).
2. O bounded context da Semana 5 (`Carrinho e Pedido` em `src/carrinho/`) e os termos do `GLOSSARIO.md` (`Carrinho`, `Cupom`, `Cotação`, `Edição`, `Disponibilidade`).
3. O comando para produzir apenas dois documentos sem escrever código de implementação: a ADR (`docs/adr/0001-confirmacao-segura-e-idempotente-no-pagamento.md`) no formato Nygard e a spec enxuta (`docs/confirmacao-segura-e-idempotente-no-pagamento-spec.md`) com os 5 padrões EARS e 3 cenários BDD em Gherkin.

## 2. O que o agente devolveu inicialmente

O agente entregou a ADR com 3 decisões claras e a spec enxuta com 5 critérios EARS e 3 cenários BDD. Na primeira versão devolvida por ele:
- Os critérios 1, 2 e 3 já vinham bem amarrados a `R5`, `R3` e `R1`.
- O critério 4 (padrão `Onde` / Feature opcional) falava em "salvar carteira favorita como padrão opcional", que não tinha origem nas falas `R1` a `R5` do `RESEARCH.md`.
- O cenário 3 de BDD testava apenas mudança de preço (repetindo parte do cenário 1) e não exercitava a preservação do Carrinho quando o pagamento é recusado (`R4`).

## 3. O que eu rejeitei ou reescrevi nos EARS e no BDD, e por quê

1. **Rejeitei e reescrevi o Critério EARS 4 (Feature opcional — `Onde`):** cortei a menção a "carteira favorita opcional" porque não tinha nenhuma frase de origem no `RESEARCH.md`. Reescrevi usando a única variação opcional real do contexto `Carrinho e Pedido` presente no `RESEARCH.md` e no §3 do README: *"Onde houver um Cupom aplicado ao Carrinho, o sistema deve revalidar o desconto do Cupom junto com o subtotal e a taxa de rede ao atualizar a Cotação antes de permitir a confirmação do Pedido"* (ancorado em `R1` e `T2`).
2. **Reescrevi o Cenário 2 de BDD para cobrir tanto a imutabilidade do recibo (`R5`) quanto a idempotência em reenvio (`R3`):** exigi que o cenário verificasse que, após o Pedido ser confirmado, uma alteração de preço da Edição para `"9.000000000000000000"` ETH não altera o total do recibo emitido e que clicar para reenviar a mesma tentativa com a mesma chave de idempotência mantém exatamente 1 Pedido criado.
3. **Reescrevi o Cenário 3 de BDD para cobrir erro/recusa e preservação do Carrinho (`R4`):** substituí o cenário redundante de preço por um cenário explícito de falha/recusa de pagamento verificando que nenhum Pedido confirmado é criado e que a Edição permanece intacta no Carrinho para nova tentativa.
4. **Rastreabilidade explícita:** adicionei abaixo de cada um dos 5 critérios EARS e de cada cenário BDD a anotação exata de qual frase `R1..R5` do `RESEARCH.md` e qual seção do `README.md` originou aquela regra.

## 4. Verificação na Sessão 3 (Implement)

Na Sessão 3 (nova sessão limpa recebendo apenas a ADR e a spec revisadas), conectamos os 3 cenários BDD ao arquivo de teste E2E `tests/e2e/semana6-bdd.spec.ts` exercitando a aplicação real com React, TanStack Router/Query, Axios, MSW e cliente Socket.IO. Os 3 cenários BDD passam integralmente com `npx playwright test tests/e2e/semana6-bdd.spec.ts`.

## 5. Saída dos Validadores (OpenSpec, TLC e Playwright)

- `python3 .claude/skills/tlc-spec-driven/scripts/validate_spec.py .specs/features/cupom-no-carrinho --strict` -> `0 error(s), 0 warning(s)`
- `npx @fission-ai/openspec@latest validate cupom-no-carrinho` -> `Change 'cupom-no-carrinho' is valid`
- `npx playwright test tests/e2e/semana6-bdd.spec.ts` -> `6 passed` (Desktop 1440px + Mobile 390px)
