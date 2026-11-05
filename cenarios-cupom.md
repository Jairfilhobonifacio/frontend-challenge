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
