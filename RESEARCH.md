# RESEARCH — Confirmação segura da compra sob mudança de cotação e falha de comunicação

Domínio: marketplace de NFTs do Desafio Frontend.

Trechos do `README.md` usados como origem:
- **T1 (§3, Carrinho):** "Refletir alterações de preço e disponibilidade recebidas enquanto o carrinho estiver aberto."
- **T2 (§3, Pagamento e confirmação):** "Revalidar preço, disponibilidade, cupom e taxas antes de confirmar a compra. Mudanças devem exigir nova confirmação do usuário."
- **T3 (§3, Pagamento e confirmação):** "Impedir pedidos duplicados em cliques repetidos ou reenvios após timeout."
- **T4 (§3, Pagamento e confirmação):** "Preservar os itens em falhas; após confirmação, remover do carrinho apenas os itens e quantidades comprados. O recibo deve reproduzir o snapshot do pedido. Alterações posteriores no catálogo não podem modificar seus valores."
- **T5 (§7, Tempo real):** "1. Um NFT está no carrinho. 2. Seu preço ou disponibilidade muda durante a navegação. 3. A interface informa a alteração e atualiza o resumo. 4. O checkout impede a confirmação com uma cotação desatualizada."

## Quem sente a dor

O **colecionador** autenticado que decidiu comprar uma ou mais Edições de NFTs que separou no Carrinho.

- Ele avalia valores em ETH onde qualquer alteração de preço, desconto de Cupom, taxa de rede ou Disponibilidade da Edição afeta diretamente a decisão de compra (T1, T2).
- No momento do pagamento, a comunicação pode demorar ou oscilar, levando o colecionador a clicar novamente no botão de confirmar ou recarregar a página sem saber se o pedido anterior foi recebido (T3).
- Se ele é um comprador recorrente ou iniciante: **o README não diz**.

## Em que momento ela aparece

1. **No instante exato de confirmar o pagamento quando o valor ou a disponibilidade mudou no meio do caminho (T2, T5):** o colecionador revisou um total no Carrinho, mas entre a revisão e a confirmação o preço subiu ou a Edição esgotou. Se o sistema confirmar em silêncio, ele paga um valor que não aceitou; se falhar sem explicar ou apagar o Carrinho, ele perde a compra que montou.
2. **Quando o envio do pagamento demora ou dá tempo esgotado e o colecionador tenta de novo (T3):** sem proteção contra repetição da mesma tentativa, um segundo clique ou reenvio após falha de comunicação cria duas cobranças para a mesma compra.
3. **Quando o pagamento é recusado (T4):** se o Carrinho for esvaziado antes da confirmação real, o colecionador precisa procurar todas as Edições e quantidades novamente.

## O que essa pessoa diria, com as próprias palavras

*(Reconstruções diretas a partir das exigências do README, marcadas como R1 a R5 para rastreabilidade na fase de Plan):*

- **R1:** "O preço da Edição mudou enquanto eu estava revisando o pagamento; o sistema não pode fechar a compra com um valor diferente sem me mostrar a nova Cotação e pedir minha confirmação de novo." *(apoia-se em T2 e T5 passo 4)*
- **R2:** "Se a última unidade da Edição acabou antes de eu concluir, preciso ser avisado na hora e impedido de pagar por algo indisponível." *(apoia-se em T1, T2 e §6 "preço alterado ou edição esgotada durante a compra")*
- **R3:** "A página demorou para responder e eu cliquei em confirmar de novo; não posso ser cobrado duas vezes pelo mesmo pedido." *(apoia-se em T3: "Impedir pedidos duplicados em cliques repetidos ou reenvios após timeout")*
- **R4:** "Meu pagamento foi recusado, mas quando voltei ao Carrinho meus itens tinham sumido e tive que montar tudo do zero." *(apoia-se em T4: "Preservar os itens em falhas; após confirmação, remover do carrinho apenas os itens e quantidades comprados")*
- **R5:** "Depois que meu pedido foi confirmado e recebi o recibo, o preço do NFT mudou na vitrine e meu recibo nunca pode mudar de valor por causa disso." *(apoia-se em T4: "O recibo deve reproduzir o snapshot do pedido. Alterações posteriores no catálogo não podem modificar seus valores")*

## O que isso custa hoje

- **Dinheiro e confiança (cobrança indevida ou valor divergente):** pagar um total em ETH maior do que o revisado na Cotação ou gerar dois pedidos idênticos por clique duplo/reenvio após lentidão (T2, T3). O valor financeiro exato em reais ou dólares **o README não diz**.
- **Erro de inventário:** confirmar compra de uma Edição cuja Disponibilidade chegou a zero enquanto o Carrinho estava aberto (T2, T5).
- **Retrabalho para o colecionador:** ter de reconstruir o Carrinho e reaplicar o Cupom caso uma falha ou recusa de pagamento apague os itens selecionados (T4).

## O que já foi tentado (se algo foi)

**O README não diz.** Trata-se do enunciado de referência do marketplace e não descreve sistemas legados nem paliativos manuais anteriores.

## Ligação com a semana 5

Esta dor vive no bounded context **Carrinho e Pedido (`src/carrinho/`)** definido no `GLOSSARIO.md`, na fronteira onde os dados de **Catálogo (`src/catalogo/`)** mudam enquanto o colecionador tenta transformar a **Cotação** do **Carrinho** em um **Pedido** confirmado:

- **Carrinho:** seleção de Edições e quantidades inteiras que deve ser preservada em qualquer falha ou recusa (R4) e limpa apenas para os itens e quantidades efetivamente confirmados (T4).
- **Cupom:** código promocional cujo desconto compõe a Cotação e precisa ser revalidado antes de confirmar a compra (T2).
- **Cotação:** cálculo oficial de subtotal, desconto, taxa de rede e total que serve de referência para o pagamento; se ficar desatualizada, bloqueia a confirmação até novo aceite (R1, T5).
- **Edição (palavra que muda de sentido no `GLOSSARIO.md`):** enquanto no Catálogo a Edição tem preço e Disponibilidade dinâmicos, no Carrinho e Pedido ela precisa ter sua Cotação revalidada antes do fechamento e, uma vez confirmada, vira um registro congelado no recibo imutável (R1, R5).

## Checklist de saída da sessão de Research

- [x] Não tem nenhuma palavra de solução técnica neste arquivo (nenhum nome de biblioteca, protocolo de rede, framework ou banco).
- [x] Uma pessoa que não conhece o projeto consegue ler isto e entender o problema do colecionador.
- [x] Cada fala reconstruída (R1 a R5) aponta diretamente para o trecho do `README.md` de onde veio.
