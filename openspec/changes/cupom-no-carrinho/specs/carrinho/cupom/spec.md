# Spec Delta

## Purpose

Permitir que o colecionador aplique e remova um Cupom no Carrinho, exibindo subtotal, desconto, taxa de rede e total coerentes com a Cotação da API em strings decimais ETH e tratando códigos inválidos ou expirados (README §3, "Carrinho").

## ADDED Requirements

### Requirement: Aplicação de Cupom válido na Cotação
Quando o colecionador informar um Cupom válido no Carrinho, o Carrinho SHALL consultar a Cotação da API e exibir o valor do desconto e o novo total em strings decimais ETH, mantendo precisão exata sem uso de ponto flutuante.

Origem: README §3, "Carrinho": "Aplicar e remover cupom, com tratamento de código inválido ou expirado." e "Exibir subtotal, desconto, taxa de rede e total coerentes com a resposta da API."

#### Scenario: Aplicar Cupom válido recalcula o desconto e o total da Cotação
- **GIVEN** que o Carrinho tem 2 unidades da Edição "Estudo de Artista" com subtotal de "0.400000000000000000" ETH e taxa de rede de "0.004200000000000000" ETH
- **WHEN** o colecionador aplica o Cupom "ARCHIVE20" de 20% de desconto
- **THEN** a Cotação mostra desconto de "0.080000000000000000" ETH e total de "0.324200000000000000" ETH

### Requirement: Tratamento de Cupom expirado ou inválido
Se o colecionador informar um Cupom expirado ou inválido, o Carrinho SHALL exibir uma mensagem específica informando se o Cupom está expirado ou inválido e MUST manter o desconto em "0.000000000000000000" ETH sem alterar os itens do Carrinho.

Origem: README §3, "Carrinho": "Aplicar e remover cupom, com tratamento de código inválido ou expirado." e §6: "cupom inválido ou expirado".

#### Scenario: Cupom expirado informa o motivo e mantém a Cotação sem desconto
- **GIVEN** que o Carrinho tem 1 unidade da Edição "Estudo de Artista" com subtotal de "0.200000000000000000" ETH e taxa de rede de "0.004200000000000000" ETH
- **WHEN** o colecionador aplica o Cupom expirado "EXPIRED50"
- **THEN** o Carrinho informa que o Cupom "EXPIRED50" está expirado e mantém desconto de "0.000000000000000000" ETH e total de "0.204200000000000000" ETH

#### Scenario: Cupom inexistente informa código inválido (acréscimo do agente)
- **GIVEN** que o Carrinho tem 1 unidade da Edição "Estudo de Artista" com subtotal de "0.200000000000000000" ETH
- **WHEN** o colecionador aplica o Cupom inexistente "INVALIDO"
- **THEN** o Carrinho informa que o Cupom é inválido e mantém o desconto zerado

### Requirement: Remoção de Cupom ativo restaura a Cotação
Quando o colecionador remover o Cupom aplicado no Carrinho, o Carrinho SHALL atualizar a Cotação na API, zerar o desconto e restaurar o total composto por subtotal mais taxa de rede.

Origem: README §3, "Carrinho": "Aplicar e remover cupom, com tratamento de código inválido ou expirado."

#### Scenario: Remover Cupom aplicado restaura o total original da Cotação
- **GIVEN** que o Carrinho tem 2 unidades da Edição "Estudo de Artista" com o Cupom "ARCHIVE20" aplicado e total de "0.324200000000000000" ETH
- **WHEN** o colecionador remove o Cupom aplicado
- **THEN** a Cotação mostra desconto de "0.000000000000000000" ETH e total de "0.404200000000000000" ETH

### Requirement: Persistência do Cupom após refresh (acréscimo do agente)
Enquanto houver um Cupom válido aplicado ao Carrinho, o Carrinho SHALL preservar esse Cupom e os valores da Cotação após recarregar a página.

Origem: README §3, "Carrinho": "Manter o carrinho após refresh e preservar os itens do visitante ao autenticar."

#### Scenario: Refresh mantém o Cupom aplicado na Cotação (acréscimo do agente)
- **GIVEN** que o colecionador aplicou o Cupom "ARCHIVE20" no Carrinho
- **WHEN** ele recarrega a página do Carrinho
- **THEN** o Cupom "ARCHIVE20" permanece ativo e a Cotação exibe o mesmo desconto de "0.080000000000000000" ETH
