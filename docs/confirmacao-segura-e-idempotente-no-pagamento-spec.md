# Confirmação segura e idempotente no pagamento — spec

**Bounded context (semana 5):** Carrinho e Pedido (`src/carrinho/`)
**ADR relacionada:** [`docs/adr/0001-confirmacao-segura-e-idempotente-no-pagamento.md`](./adr/0001-confirmacao-segura-e-idempotente-no-pagamento.md)
**Escala:** M — cruza a fronteira entre a volatilidade do Catálogo e o contrato financeiro do Pedido.

## Contexto

Quando o colecionador avança do Carrinho para o pagamento, duas falhas críticas ameaçam a compra (`RESEARCH.md`): primeiro, o preço ou a Disponibilidade de uma Edição no Carrinho pode mudar antes do clique final (R1, R2), tornando a Cotação exibida desatualizada; segundo, lentidão ou timeout no envio do pagamento faz o colecionador clicar novamente ou recarregar a página, correndo o risco de gerar dois Pedidos para a mesma compra (R3) ou perder os itens do Carrinho se o pagamento for recusado (R4). Além disso, após a confirmação, alterações futuras no Catálogo jamais podem alterar os valores registrados no recibo (R5).

## Decisão

1. Enquanto o colecionador estiver no Carrinho ou no checkout, qualquer alteração de preço ou Disponibilidade de uma Edição presente no Carrinho atualiza o resumo, informa a mudança e marca a Cotação como desatualizada, impedindo a confirmação até que o colecionador aceite a nova Cotação (ou bloqueando o envio se a Edição esgotou).
2. Toda solicitação de criação de Pedido envia uma chave de idempotência vinculada à tentativa: cliques repetidos ou reenvios após timeout recuperam o mesmo Pedido sem duplicar a compra.
3. Em caso de pagamento recusado ou falha, o Carrinho permanece intacto; quando o Pedido é confirmado, o recibo grava um snapshot imutável dos valores e apenas os itens comprados saem do Carrinho.

## Fora de escopo

- Integração com extensões reais de carteira na blockchain ou gateways bancários externos (README §1).
- Páginas editoriais, histórico global de ofertas ou leilões (README §3).
- Políticas de reembolso pós-confirmação (pedidos confirmados ou recusados são estados terminais, README §7).

## Critérios (EARS)

1. **Ubíqua:** O sistema deve registrar o recibo do Pedido confirmado como um snapshot imutável dos itens, taxas e total da Cotação aceita, mantendo esses valores inalterados mesmo quando o preço ou a Disponibilidade da Edição mudar posteriormente no Catálogo.
   *(Origem: frase **R5** do `RESEARCH.md`; `README.md` §3 "Pagamento e confirmação": "O recibo deve reproduzir o snapshot do pedido. Alterações posteriores no catálogo não podem modificar seus valores.")*

2. **Orientada a evento:** Quando o colecionador reenviar a confirmação da compra após clique repetido ou timeout usando a mesma chave de idempotência e o mesmo conteúdo, o sistema deve recuperar o mesmo Pedido existente sem criar um Pedido duplicado.
   *(Origem: frase **R3** do `RESEARCH.md`; `README.md` §3 "Pagamento e confirmação": "Impedir pedidos duplicados em cliques repetidos ou reenvios após timeout" e §5 "Pedidos": "Na simulação, a mesma tentativa deve recuperar o mesmo pedido.")*

3. **Orientada a estado:** Enquanto a Cotação do Carrinho estiver desatualizada por mudança de preço ou de Disponibilidade recebida durante a navegação, o checkout deve exibir o alerta da alteração e impedir a confirmação do Pedido até que o colecionador revalide e aceite a nova Cotação.
   *(Origem: frases **R1** e **R2** do `RESEARCH.md`; `README.md` §7 "Tempo real": "3. A interface informa a alteração e atualiza o resumo. 4. O checkout impede a confirmação com uma cotação desatualizada.")*

4. **Feature opcional:** Onde houver um Cupom aplicado ao Carrinho, o sistema deve revalidar o desconto do Cupom junto com o subtotal e a taxa de rede ao atualizar a Cotação antes de permitir a confirmação do Pedido.
   *(Origem: frase **R1** e seção "Ligação com a semana 5" do `RESEARCH.md`; `README.md` §3 "Pagamento e confirmação": "Revalidar preço, disponibilidade, cupom e taxas antes de confirmar a compra.")*

5. **Comportamento indesejado:** Se o pagamento do Pedido for recusado ou se a Disponibilidade da Edição no Carrinho cair para zero antes da confirmação, então o sistema deve impedir a confirmação da compra, exibir o motivo ao colecionador e preservar os itens no Carrinho.
   *(Origem: frases **R2** e **R4** do `RESEARCH.md`; `README.md` §3 "Pagamento e confirmação": "Preservar os itens em falhas" e §6: "preço alterado ou edição esgotada durante a compra" / "pagamento confirmado e pagamento recusado".)*

## Cenários (BDD)

```gherkin
# language: pt
Funcionalidade: Confirmação segura e idempotente no pagamento

  Cenário: Mudança de preço em tempo real bloqueia a confirmação até o colecionador aceitar a nova Cotação
    Dado que o colecionador está no checkout com 1 unidade da Edição "Estudo de Artista" do NFT "Phase shift 001" no Carrinho
    Quando o preço da Edição "Estudo de Artista" muda em tempo real enquanto o checkout está aberto
    Então a interface informa que a Cotação está desatualizada e desabilita o botão de confirmar a compra
    E quando o colecionador aceita atualizar a nova Cotação e revisa os itens, o botão de confirmar volta a ficar habilitado
    # Origem: R1, R2 do RESEARCH.md; README §7 passos 1 a 4 e §3 Pagamento e confirmação.

  Cenário: Pedido confirmado gera recibo imutável e reenvio idempotente não duplica o Pedido
    Dado que o colecionador revisou a Cotação válida no checkout para a Edição "Estudo de Artista"
    Quando o colecionador confirma a compra e o Pedido é confirmado
    Então o sistema exibe o recibo confirmado e limpa o item comprado do Carrinho
    E uma mudança posterior de preço da Edição para "9.000000000000000000" ETH não altera o total gravado no recibo
    E um reenvio da mesma tentativa com a mesma chave de idempotência recupera o mesmo Pedido mantendo apenas 1 Pedido criado
    # Origem: R3, R5 do RESEARCH.md; README §3 Pagamento e confirmação e §5 Pedidos.

  Cenário: Pagamento recusado ou Edição esgotada impede a compra e preserva o Carrinho
    Dado que o colecionador está no checkout com 1 unidade da Edição "Estudo de Artista" no Carrinho
    Quando o pagamento é recusado na finalização da compra
    Então o sistema exibe o estado de pagamento recusado sem confirmar o Pedido
    E preserva o item intacto no Carrinho para nova tentativa
    # Origem: R2, R4 do RESEARCH.md; README §3 Pagamento e confirmação e §6 Mocking com MSW.
```

## Como eu vou saber que funcionou

O comando `npx playwright test tests/e2e/semana6-bdd.spec.ts` executa os 3 cenários BDD acima em navegador real (Chromium) passando pelas camadas de Axios, MSW REST e cliente Socket.IO, e todos os 3 cenários passam sem erro.

## Linguagem ubíqua usada aqui

| Termo | O que significa neste projeto (`GLOSSARIO.md`) |
|---|---|
| **NFT** | Obra digital colecionável listada no Catálogo |
| **Edição** | No Catálogo, tiragem consultável; no Carrinho e Pedido, item reservado cuja Cotação é revalidada e congelada no recibo |
| **Disponibilidade** | Quantidade de unidades ainda compráveis da Edição |
| **Carrinho** | Conjunto de Edições e quantidades inteiras separadas pelo colecionador |
| **Cupom** | Código promocional aplicado ao Carrinho que abate valor na Cotação |
| **Cotação** | Cálculo oficial da API (subtotal, desconto, taxa de rede e total em strings decimais ETH) usado para fechar o Pedido |
