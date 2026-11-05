# ADR-0001: Exigir revalidação de Cotação e chave de idempotência na confirmação do Pedido

## Status

Aceita

## Contexto

No fluxo de compra do marketplace (`RESEARCH.md`), o colecionador monta o Carrinho enquanto o preço e a Disponibilidade de cada Edição continuam mudando no Catálogo (R1, R2). Além disso, falhas transitórias ou tempo esgotado no envio do pagamento levam o colecionador a clicar repetidamente ou reenviar a compra (R3), e recusas de pagamento não podem apagar os itens selecionados (R4). Precisamos garantir que nenhum Pedido seja confirmado com Cotação vencida, que reenvios da mesma tentativa não dupliquem cobranças e que o recibo confirmado seja um snapshot imutável (R5).

## Decisão

1. Bloquear a confirmação da compra sempre que uma atualização de preço ou Disponibilidade tornar a Cotação atual desatualizada (`STALE_QUOTE`) ou esgotar a Edição (`EDITION_SOLD_OUT`), exigindo que o colecionador aceite explicitamente a nova Cotação antes de prosseguir.
2. Associar uma chave de idempotência única a cada intenção de compra no checkout: cliques repetidos ou reenvios após timeout com a mesma chave e o mesmo conteúdo recuperam o mesmo Pedido sem duplicar cobrança; reutilizar a mesma chave com conteúdo divergente retorna conflito.
3. Preservar o Carrinho intacto em qualquer recusa ou falha de comunicação e, somente após o Pedido atingir o estado confirmado, gerar o recibo como snapshot imutável e remover do Carrinho apenas os itens e quantidades comprados.

## Alternativas consideradas

- **Desabilitar apenas o botão no cliente sem chave de idempotência na API:** descartada porque um refresh da página ou reconexão após timeout reabilitaria o botão e criaria um segundo Pedido na API (viola R3 e README §5).
- **Atualizar o valor e confirmar a compra automaticamente no servidor:** descartada porque cobraria do colecionador um valor em ETH diferente do que ele viu e autorizou (viola R1 e README §3/§7).

## Consequências

**Positivas:**
- O colecionador nunca paga um valor diferente do aceito na Cotação nem sofre cobrança duplicada após timeout ou clique repetido.
- O recibo permanece imutável mesmo quando o preço da Edição muda depois no Catálogo.

**Negativas / trade-offs:**
- Em momentos de alta volatilidade de preço, o colecionador precisa dar um clique adicional para revisar e aceitar a nova Cotação antes de liquidar o Pedido.
- O servidor simulado precisa armazenar os registros de idempotência por tentativa de compra.
