# Glossário: Marketplace de NFTs

## Contexto 1: Catálogo (pasta: `src/catalogo/`)
O colecionador explora, filtra e avalia obras digitais antes de decidir adicioná-las à compra.

| Termo | Significado neste contexto | Origem no README |
|---|---|---|
| **NFT** | Obra digital colecionável exibida com galeria, informações, edições e valor de vitrine | §3 "Detalhes do NFT" |
| **Favorito** | NFT marcado pelo colecionador autenticado para consulta rápida, persistido na sua conta | §3 "Favoritos devem persistir para o usuário autenticado" |
| **Disponibilidade** | Quantidade de unidades ainda compráveis de uma tiragem, atualizada em tempo real | §3 "respeitando a disponibilidade por NFT e edição"; §7 `nft.updated` |

## Contexto 2: Carrinho e Pedido (pasta: `src/carrinho/`)
O colecionador reúne os itens escolhidos, aplica descontos, confere a cotação oficial e confirma a compra com recibo imutável.

| Termo | Significado neste contexto | Origem no README |
|---|---|---|
| **Carrinho** | Seleção de itens com quantidades inteiras que sobrevive a refresh e é preservada quando o visitante autentica | §3 "Manter o carrinho após refresh e preservar os itens do visitante ao autenticar" |
| **Cupom** | Código promocional aplicado ao Carrinho para abater valor na Cotação, sujeito a validação de código inválido ou expirado | §3 "Aplicar e remover cupom, com tratamento de código inválido ou expirado" |
| **Cotação** | Cálculo oficial da API contendo subtotal, desconto, taxa de rede e total em strings decimais ETH, usado como referência obrigatória para fechar o Pedido | §3 "Exibir subtotal, desconto, taxa de rede e total coerentes com a resposta da API"; "A cotação da API é a referência para finalizar o pedido" |

## Palavra que muda de sentido entre os dois contextos
- **Edição**:
  - No **Catálogo (`src/catalogo/`)**, **Edição** é uma modalidade ou tiragem publicada da obra (como série limitada ou peça única) que o colecionador inspeciona na vitrine para comparar tiragem e disponibilidade (§3 "Galeria, informações, edição, quantidade").
  - No **Carrinho e Pedido (`src/carrinho/`)**, **Edição** é o item comercial reservado com quantidade inteira vinculada a uma Cotação; se sua disponibilidade zerar ou seu valor mudar antes do envio, ela bloqueia a confirmação do Pedido, e após a confirmação ela vira uma linha congelada no snapshot do recibo (§3 "Revalidar preço, disponibilidade, cupom e taxas antes de confirmar a compra"; "O recibo deve reproduzir o snapshot do pedido").

## Núcleo do projeto
Permitir que o colecionador descubra e compre edições digitais com precisão financeira exata em ETH e proteção em tempo real contra cotações desatualizadas, cobranças duplicadas ou perda de sessão no meio do checkout.
