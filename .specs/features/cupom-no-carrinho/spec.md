# Cupom de desconto na Cotação do Carrinho Specification

Contexto: Carrinho e Pedido -> `src/carrinho/`. Termos conforme `GLOSSARIO.md`.
Origem no `README.md` (§3 "Carrinho", §5 "Cotação", §6 "Mocking com MSW"):
- **F1 (§3 Carrinho):** "Aplicar e remover cupom, com tratamento de código inválido ou expirado."
- **F2 (§3 Carrinho):** "Exibir subtotal, desconto, taxa de rede e total coerentes com a resposta da API."
- **F3 (§3 Carrinho):** "Valores em ETH devem trafegar como strings decimais e manter precisão nos cálculos e na apresentação. Quantidades são inteiras. A cotação da API é a referência para finalizar o pedido."

## Problem Statement

O colecionador no Carrinho precisa aplicar ou remover um Cupom de desconto e ver subtotal, desconto, taxa de rede e total atualizados pela Cotação oficial da API em strings decimais ETH com precisão exata, recebendo feedback claro quando o código for inválido ou estiver expirado (F1, F2, F3).

## Goals

- [x] Os 3 cenários em `cenarios-cupom.md` passam sem alteração nas linhas Dado/Quando/Então.
- [x] O Cupom válido persiste após refresh e todos os valores em ETH mantêm 18 casas decimais exatas sem ponto flutuante.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Busca e filtros do Catálogo | Pertencem ao contexto `src/catalogo/` (fora desta cerca) |
| Seleção de carteira e envio do Pedido | Pertencem ao passo de pagamento e confirmação |
| Cumulatividade de múltiplos cupons simultâneos | O README fala em "aplicar e remover cupom" no singular |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Quantidade de cupons por Carrinho | Apenas 1 Cupom ativo por vez; aplicar outro substitui o anterior | O README usa o singular ("aplicar e remover cupom") | y (pergunta 1) |
| Normalização do código digitado | Remover espaços nas pontas e comparar sem diferenciar maiúsculas/minúsculas | Evita erro por espaço acidental ao colar o código | y (pergunta 2) |
| Comportamento ao aplicar Cupom inválido quando já havia um válido | Manter o estado anterior sem aplicar o código inválido e informar o erro | Não punir erro de digitação limpando a Cotação sem aviso | y (pergunta 3) |
| Persistência do Cupom no refresh | O Cupom aplicado sobrevive ao refresh junto com o Carrinho | Segue a regra de manter o Carrinho após refresh (§3) | y (pergunta 4) |

**Open questions:** none - all resolved or logged above.

## Cenários do colecionador (base da spec)

```gherkin
# language: pt
Funcionalidade: Cupom de desconto na Cotação do Carrinho

  Cenário: Aplicar Cupom válido recalcula o desconto e o total da Cotação
    Dado que o Carrinho tem 2 unidades da Edição "Estudo de Artista" com subtotal de "0.400000000000000000" ETH
    E a taxa de rede da Cotação é "0.004200000000000000" ETH
    Quando o colecionador aplica o Cupom "ARCHIVE20" de 20% de desconto
    Então a Cotação mostra desconto de "0.080000000000000000" ETH
    E a Cotação mostra total de "0.324200000000000000" ETH

  Cenário: Cupom expirado informa o motivo e mantém a Cotação sem desconto
    Dado que o Carrinho tem 1 unidade da Edição "Estudo de Artista" com subtotal de "0.200000000000000000" ETH
    E a taxa de rede da Cotação é "0.004200000000000000" ETH
    Quando o colecionador aplica o Cupom expirado "EXPIRED50"
    Então o Carrinho informa que o Cupom "EXPIRED50" está expirado
    E a Cotação mantém desconto de "0.000000000000000000" ETH e total de "0.204200000000000000" ETH

  Cenário: Remover Cupom aplicado restaura o total original da Cotação
    Dado que o Carrinho tem 2 unidades da Edição "Estudo de Artista" com o Cupom "ARCHIVE20" aplicado
    E a Cotação mostra desconto de "0.080000000000000000" ETH e total de "0.324200000000000000" ETH
    Quando o colecionador remove o Cupom aplicado
    Então a Cotação mostra desconto de "0.000000000000000000" ETH
    E a Cotação mostra total de "0.404200000000000000" ETH
```

## User Stories

### P1: Aplicar e remover Cupom na Cotação ⭐ MVP

**User Story**: Como colecionador, quero aplicar e remover um Cupom no Carrinho e ver o desconto e o total recalculados pela API com precisão decimal em ETH.

**Why P1**: F1, F2 e F3 são obrigatórias no README (§3 "Carrinho").

**Acceptance Criteria**:
1. WHEN o colecionador aplica um Cupom válido no Carrinho THEN o Carrinho SHALL consultar a Cotação da API e exibir subtotal, desconto, taxa de rede e total em strings decimais ETH coerentes com a resposta `[CUPOM-01]`
2. WHEN o colecionador remove o Cupom ativo no Carrinho THEN o Carrinho SHALL atualizar a Cotação na API, zerar o desconto e restaurar o total composto por subtotal mais taxa de rede `[CUPOM-02]`
3. WHILE houver um Cupom válido aplicado ao Carrinho THEN o Carrinho SHALL preservar o Cupom e os valores da Cotação após refresh da página `[CUPOM-03]`

### P1: Tratamento de Cupom inválido ou expirado ⭐ MVP

**User Story**: Como colecionador, quero saber claramente se o Cupom digitado está expirado ou é inválido, sem perder os itens do meu Carrinho.

**Why P1**: F1 exige tratamento explícito de código inválido ou expirado e §6 exige fixtures determinísticas para ambos.

**Acceptance Criteria**:
1. IF o colecionador aplica um Cupom expirado THEN o Carrinho SHALL exibir mensagem informando que o Cupom está expirado e manter o desconto em "0.000000000000000000" ETH `[CUPOM-04]`
2. IF o colecionador aplica um Cupom inexistente ou inválido THEN o Carrinho SHALL exibir mensagem informando que o Cupom é inválido e preservar os itens e quantidades do Carrinho `[CUPOM-05]`
3. The Carrinho SHALL representar subtotal, desconto, taxa de rede e total da Cotação exclusivamente como strings decimais em ETH `[CUPOM-06]`

## Requirement Traceability

| Requirement ID | Story | Phase | Status | Origem (README §3 / §6) |
| -------------- | ----- | ----- | ------ | ----------------------- |
| CUPOM-01 | P1: Aplicar e remover Cupom na Cotação | Specify | Verified | F1 e F2 · cenário 1 |
| CUPOM-02 | P1: Aplicar e remover Cupom na Cotação | Specify | Verified | F1 "Aplicar e remover cupom" · cenário 3 |
| CUPOM-03 | P1: Aplicar e remover Cupom na Cotação | Specify | Verified | §3 "Manter o carrinho após refresh" |
| CUPOM-04 | P1: Tratamento de Cupom inválido ou expirado | Specify | Verified | F1 "tratamento de código inválido ou expirado" · cenário 2 |
| CUPOM-05 | P1: Tratamento de Cupom inválido ou expirado | Specify | Verified | F1 e §6 "cupom inválido ou expirado" |
| CUPOM-06 | P1: Tratamento de Cupom inválido ou expirado | Specify | Verified | F3 "Valores em ETH devem trafegar como strings decimais" |
