# Diferenças: o que escrevi à mão × o que o agente gerou (Semana 5)

1. **Acrescentou:** adicionou 2 cenários novos além dos 3 que escrevi em `cenarios-cupom.md` — um cenário específico para código de Cupom inexistente (`INVALIDO`, separando de `EXPIRED50`) e outro para persistência do Cupom aplicado após refresh da página, ambos ancorados no §3 do README.
2. **Mudou:** nos meus cenários originais eu havia escrito `"0.4 ETH"` e `"0.08 ETH"`; o agente pediu para padronizar em strings decimais de 18 casas (`"0.400000000000000000" ETH`) para refletir literalmente a regra do §3 ("Valores em ETH devem trafegar como strings decimais e manter precisão").
3. **Perguntou:** fez 4 perguntas de fronteira antes de fechar a spec — se dois cupons podiam acumular no mesmo Carrinho, se espaços e letras minúsculas no código deveriam ser normalizados, o que aconteceria se o colecionador tentasse um Cupom inválido quando já havia um válido ativo, e se o Cupom deveria sobreviver ao refresh.

## Comparação OpenSpec × TLC (Faixa Completa — Semana 5)

**Qual perguntou mais:** o **TLC (`tlc-spec-driven`)** estruturou melhor as dúvidas antes de gerar os critérios, transformando as 4 perguntas em linhas explícitas na tabela `Assumptions & Open Questions` com coluna de confirmação e justificativa. O OpenSpec fez perguntas parecidas durante o `/opsx:propose`, mas já gerou os 4 arquivos (`proposal.md`, `spec.md`, `tasks.md`, `.openspec.yaml`) na mesma passada.

**Qual inventou mais:** o **OpenSpec** inventou mais cenários Gherkin novos (criou cenários completos para Cupom inexistente e refresh dentro do `spec.md`), enquanto o **TLC** manteve os meus 3 cenários intactos em uma seção separada e desdobrou as regras adicionais como critérios EARS numerados (`CUPOM-01` a `CUPOM-06`) e tabela de rastreabilidade (`Requirement Traceability`).

**Qual eu usaria neste projeto e por quê:** para este Marketplace de NFTs eu usaria o **TLC** na fase de especificação de regras críticas (como Cotação e Checkout) combinado com a validação de cerca do **OpenSpec**. O script `validate_spec.py` do TLC obriga que toda premissa assumida tenha justificativa explícita, que nenhuma pergunta aberta fique sem decisão (`Open questions: none`) e que cada critério tenha formato EARS verificável e ID rastreável até a frase do `README.md`, o que evita que o agente invente regras financeiras silenciosamente.
