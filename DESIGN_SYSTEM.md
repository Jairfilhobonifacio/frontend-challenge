# KRONOS // ARCHIVE Design System v1.0

**Volume 01 · 21 de outubro de 2026 · plataforma web · PT-BR**

Este é o contrato técnico da identidade definida em [MIV-OFICIAL.md](MIV-OFICIAL.md) e resumida em [DESIGN.md](DESIGN.md). Sua tradução executável vive em [design-tokens.dtcg.json](src/styles/design-tokens.dtcg.json), na rota `/design` e no [workbench independente](kronos-design-system.html). A assinatura permanece: **O tempo passa. A arte fica.**

Identidade autoral proposta para o marketplace; este documento não implica aprovação de marca, conformidade integral WCAG, lançamento ou transações reais. Os workbenches simulam estados localmente. O comportamento de compra do aplicativo continua pertencendo ao motor existente.

## 01. Filosofia & Princípios Arquivísticos

### Um instrumento de precisão mineral

Cada obra é um registro permanente. A interface sustenta autoria, contexto, edição e preço, sem disputar atenção cromática com a arte. A marca combina presença **escultural**, engenharia **rigorosa** e comunicação **humana**. Evitar linguagem de cassino, urgência artificial, escassez inventada e cotações opacas.

O arquétipo dominante é Curador / Sábio, com apoio do Criador. O posicionamento do MIV é tratar a aquisição como decisão técnica transparente: consentimento explícito sobre preço e recibo imutável. A interface deve tornar essa intenção verificável, sem prometer permanência de infraestrutura ou garantias financeiras.

### Regra 60–30–10

| Parcela de composição | Material | Aplicação |
| --- | --- | --- |
| 60% / campo dominante | Papel de Arquivo | Página, respiro, passe-partout e texto invertido. |
| 30% / tinta e estrutura | Grafite Mineral | Tipografia, divisores mestres, abas ativas, versões, rodapé. Não significa escurecer 30% de cada tela. |
| ≤10% / ação | Cobalto | CTA primário e foco de teclado. O limite é disciplina compositiva, não uma quota a preencher. |
| Suportes | Placa, Legenda, Linha, Fio | Superfícies técnicas, texto secundário, bordas e divisores. |
| Exceção semântica | Óxido | Impedimento real: erro, validação, cotação vencida, rede, conflito de idempotência. |

A arte tem **autonomia cromática absoluta**. Os pigmentos do espécime geométrico pertencem à mídia, não são tokens de interface. Nenhuma superfície usa branco ou preto puro. Preto a 16% é permitido exclusivamente no contorno interno técnico da mídia, conforme o MIV.

### Zero Token Role Drift

Um papel não muda entre páginas ou estados. `--action` não colore carimbos, gráficos ou seções. `--error` não significa luxo, destaque ou seleção. `--hair` não identifica controles. `--muted` não vira texto pequeno sobre Placa. Seleção é estrutural em Grafite; não precisa de cobalto. Estados de hover preservam o papel da variante.

### Referências e decisões preservadas

Esta entrega documenta a identidade existente; não repete nem reivindica uma nova pesquisa Refero. As referências históricas abaixo foram lidas no MIV fornecido. Os MCPs Refero não estavam disponíveis nesta execução.

| Fonte inspecionada | Papel delimitado | Decisão preservada |
| --- | --- | --- |
| MIV-OFICIAL.md / teenage engineering OP–1 field | Referência dominante de instrumento | Campo mineral, precisão de 1px, ausência de sombra decorativa. |
| MIV-OFICIAL.md / Analogue Pocket | Registro e especificação | Códigos `// K—NNN`, carimbos, metadados monoespaçados. |
| MIV-OFICIAL.md / OPX Studio | Escala de galeria | Display condensado monumental, leading comprimido. |
| MIV-OFICIAL.md / Rarible, Coinbase NFT, Shop Checkout | Arquitetura transacional histórica | Obra + ficha, edições, revisão, confirmação e recibo. |
| `assets/icons/k-icon-*.svg` / 20 arquivos originais | Gramática de sinais | SVGs reaproveitados sem redesenho aproximado. |
| `assets/backgrounds/bg-archival-calibration-grid.svg` e CSS existente | Calibração | Grade fina 32px e mestra 128px. |
| Refero / craft-details e color, consultados localmente | Complemento de engenharia | Rótulos explícitos, papéis estáveis, alvos de toque e contraste contextual. |

**Reference lock:** Papel dominante; Barlow Condensed; fichas em IBM Plex Mono; geometria seca na arte; ação rara. A navegação lateral, a matriz de contraste, o inspetor e os exportadores são complementos de documentação desta versão. Não introduzem nova identidade. O caminho adotado foi sistematizar → produzir → revisar a renderização → corrigir → validar.

## 02. Arquitetura de Tokens em 3 Camadas

```text
primitive.color.action        #2F4DEB / matéria cromática
           ↓
semantic.color.action         função: CTA primário e foco
           ↓
component.button.primary-background   consumo pelo botão
```

`src/styles/design-tokens.dtcg.json` é a fonte canônica dos valores. `npm run ds:sync` gera `src/styles/tokens.css` e a biblioteca React a partir dos SVGs. Não editar os arquivos gerados à mão. `npm run ds:standalone` sincroniza e empacota o mesmo React em HTML autocontido; `npm run build` executa isso automaticamente antes do build.

### Tipos de intercâmbio

O arquivo segue o [DTCG Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/): tokens com `$type`, `$value`, `$description`; aliases `{primitive.color.paper}`; cores estruturadas `colorSpace: srgb`, componentes 0–1 e alfa separado. DTCG é um relatório final de Community Group, **não uma Recomendação W3C**.

Não existe tipo DTCG `radius`: raios usam `$type: dimension` e a extensão `archive.kronos.category: radius`. `typography` inclui família, tamanho, peso, leading e tracking. `border` contém cor, espessura e estilo. Curvas são `cubicBezier`. Durações usam `duration`. `clamp()` e features de fonte ficam em `$extensions.archive.kronos`, pois não são tipos básicos do formato; a dimensão de referência permanece válida.

### Paleta canônica

HEX/sRGB é a referência de produção. OKLCH abaixo foi calculado a partir do sRGB e coincide com o MIV a quatro casas. O alfa de Fio não pode ser removido.

<!-- PALETTE:START -->
| CSS / Primitive | Nome | HEX / alfa | RGB | OKLCH | Papel |
| --- | --- | --- | --- | --- | --- |
| `--paper` / `primitive.color.paper` | Papel de Arquivo | `#F0F1ED` | 240, 241, 237 | `oklch(0.9563 0.0054 117.92)` | Campo dominante, passe-partout e texto invertido. 60%. |
| `--plate` / `primitive.color.plate` | Cinza de Placa | `#DDE1DE` | 221, 225, 222 | `oklch(0.9058 0.0059 153.77)` | Superfície técnica, skeleton e hover secundário. |
| `--ink` / `primitive.color.ink` | Grafite Mineral | `#161D1B` | 22, 29, 27 | `oklch(0.2229 0.0110 176.05)` | Texto principal, estrutura, abas ativas e versão. 30%. |
| `--muted` / `primitive.color.muted` | Legenda | `#5D6861` | 93, 104, 97 | `oklch(0.5056 0.0174 157.83)` | Texto secundário exclusivamente sobre papel. |
| `--line` / `primitive.color.line` | Linha de Controle | `#7C8880` | 124, 136, 128 | `oklch(0.6145 0.0184 156.64)` | Bordas de inputs, seletores e botões secundários. |
| `--action` / `primitive.color.action` | Cobalto de Ação | `#2F4DEB` | 47, 77, 235 | `oklch(0.5101 0.2377 267.72)` | Exclusivo CTA primário e foco de teclado. Máximo 10%. |
| `--error` / `primitive.color.error` | Óxido de Alerta | `#9E2E24` | 158, 46, 36 | `oklch(0.4714 0.1496 29.05)` | Impedimento: cotação stale, rede, validação e conflito. |
| `--hair` / `primitive.color.hair` | Fio de Arquivo | `#161D1B / 18%` | 22, 29, 27 / 18% | `oklch(0.2229 0.0110 176.05 / 18%)` | Separador decorativo, não indica foco ou controle. |
<!-- PALETTE:END -->

### Matriz WCAG 2.2 / sRGB

Luminância: linearizar cada canal sRGB com `c ≤ 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055)^2.4`; calcular `L = 0.2126R + 0.7152G + 0.0722B`; razão `(Lmaior + 0.05) / (Lmenor + 0.05)`. A classificação usa o valor sem arredondar; somente a apresentação usa duas casas. Cores alfa são compostas sobre o fundo e, para fundos alfa, sobre Papel.

| Critério | Normal | Grande |
| --- | --- | --- |
| AA / SC 1.4.3 | ≥4,5:1 | ≥3:1 |
| AAA / SC 1.4.6 | ≥7:1 | ≥4,5:1 |
| Limites visuais necessários de controles / SC 1.4.11 | ≥3:1 contra cores adjacentes | Não depende do tamanho da fonte |

Texto grande: pelo menos 24 CSS px regular ou cerca de 18,67 CSS px em negrito. Metadados de 9–11px continuam sujeitos a 4,5:1. AAA para um par não certifica AAA para a página.

<!-- CONTRAST:START -->
| Texto ↓ / Fundo → | paper | plate | ink | muted | line | action | error | hair |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| paper | 1.00 · × | 1.16 · × | 15.10 · AAA | 5.12 · AA | 3.25 · × | 5.47 · AA | 6.45 · AA | 1.44 · × |
| plate | 1.16 · × | 1.00 · × | 12.97 · AAA | 4.39 · × | 2.79 · × | 4.70 · AA | 5.54 · AA | 1.24 · × |
| ink | 15.10 · AAA | 12.97 · AAA | 1.00 · × | 2.95 · × | 4.64 · AA | 2.76 · × | 2.34 · × | 10.47 · AAA |
| muted | 5.12 · AA | 4.39 · × | 2.95 · × | 1.00 · × | 1.57 · × | 1.07 · × | 1.26 · × | 3.55 · × |
| line | 3.25 · × | 2.79 · × | 4.64 · AA | 1.57 · × | 1.00 · × | 1.68 · × | 1.98 · × | 2.25 · × |
| action | 5.47 · AA | 4.70 · AA | 2.76 · × | 1.07 · × | 1.68 · × | 1.00 · × | 1.18 · × | 3.79 · × |
| error | 6.45 · AA | 5.54 · AA | 2.34 · × | 1.26 · × | 1.98 · × | 1.18 · × | 1.00 · × | 4.47 · × |
| hair | 1.44 · × | 1.43 · × | 1.00 · × | 1.23 · × | 1.30 · × | 1.23 · × | 1.21 · × | 1.41 · × |
<!-- CONTRAST:END -->

Pares operacionais: Grafite/Papel ≈15,10 AAA; Grafite/Placa ≈12,97 AAA; Legenda/Papel ≈5,12 AA; Papel/Cobalto ≈5,47 AA; Óxido/Papel ≈6,45 AA. **Legenda/Placa ≈4,39 reprova texto normal**, mesmo que pareça próximo de 4,5. `--line` é borda, não cor de legenda. `--hair` não satisfaz contraste de controle.

Fontes dos critérios: [contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [contraste aumentado](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html), [contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). A matriz interativa permite qualquer par para diagnóstico; aprovar contraste não autoriza mudar seu papel.

### Contrato de consumo

| Camada | Pode referenciar | Responsabilidade | Exemplo |
| --- | --- | --- | --- |
| Primitive | Valores literais | Matéria, medidas e famílias | `--primitive-paper`, `--radius-inner` |
| Semantic | Primitive | Função estável | `--paper`, `--border-control`, tipografia ETH |
| Component | Semantic ou medida Primitive | Anatomia concreta | `--button-primary-background`, `--frame-padding` |

O CSS legado conserva os nomes semânticos curtos. Os aliases de componentes permitem migração progressiva sem duplicar a paleta. Números internos de SVG são geometria do ativo, não variáveis de layout. Toda proposta de novo token precisa de papel, origem e estado; cores por conveniência são recusadas.

## 03. Tipografia & Escala Fluida

### Famílias e licenças

| Papel | Família | Pesos canônicos | Fallback |
| --- | --- | --- | --- |
| Display / manifesto, títulos, obras | Barlow Condensed | 600, 700 | Arial Narrow, sans-serif |
| Interface / leitura, rótulos, botões, erros | Manrope | 400, 600, 700 | Arial, sans-serif |
| Registro / ETH, Wei, versões, timestamps, chaves | IBM Plex Mono | 400, 500 | Consolas, monospace |

As sete fontes estão em `public/fonts`, com os três avisos **SIL OFL 1.1** preservados. `src/styles/fonts.css` serve as fontes localmente. O HTML incorpora os mesmos binários e licenças. Não há dependência de Google Fonts em tempo de uso. Acentos PT-BR fazem parte do espécime. Fontes técnicas: [Barlow](https://github.com/google/fonts/tree/main/ofl/barlowcondensed), [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope), [IBM Plex Mono](https://github.com/google/fonts/tree/main/ofl/ibmplexmono).

### Escalas canônicas

| Estilo | Tamanho | Peso | Leading | Tracking / comportamento |
| --- | --- | --- | --- | --- |
| Capa do MIV | `clamp(110px, 23vw, 340px)` | 700 | 0,82–0,90 | −0,035em; texto estrutural em caixa alta |
| Vitrine | `clamp(65px, 9vw, 138px)` | 600/700 | 0,90–0,98 | −0,025em |
| H1 / DESIGN.md | 72px / 4,5rem | 700 | 0,90 | −0,025em / −1,8px na referência |
| H2 | 48px / 3rem | 600 | 0,98 | −0,02em / −0,96px |
| H3 | 27px / 1,6875rem | 600 | 1,10 | 0 |
| Leitura | 14px / 16px | 400 | 1,65 | 0; `text-wrap: pretty` |
| Botão | 12px | 700 | 1,20 | 0 |
| ETH | 16px | 400 | 1,50 | `tnum` + `zero`; sem truncar na revisão |
| Ficha `// K—NNN` | 9–10px / referência 10px | 400 | 1,50 | 0,03em |
| Eyebrow | 11px | 400 | 1,50 | 0,07em |

O título do workbench usa escala editorial responsiva própria de documentação (`70px → 162px`, reduzida a `54px → 84px` em telas estreitas) para acomodar o conteúdo extenso. É uma composição de documentação, não substitui a escala de capa/vitrine do MIV. O espécime permite tamanhos de 24–120px para inspeção, sem alterar tokens.

`text-wrap: balance` em títulos; `pretty` nos parágrafos. Manter títulos inteiros em uma família, sem palavra isolada em itálico ou fonte distinta. Evitar órfãs, cortes de acentos e comprimir letras para caber. Comprimentos técnicos podem rolar em seu contêiner, nunca empurrar a página.

```css
.mono, .eth {
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1, "zero" 1;
}
```

### Precisão financeira como regra visual

```ts
parseEthToWei('0.180000000000000001') // 180000000000000001n
formatWeiToEth(180000000000000002n)  // '0.180000000000000002'
```

ETH entra como string decimal não negativa de até 18 casas. Wei usa `BigInt`. Nunca usar `parseFloat`, `Number`, `toFixed` ou arredondamento para calcular ETH. O formatador exato conserva 18 casas na revisão; a listagem pode abreviar, desde que o valor exato esteja disponível antes do consentimento. `// K—001`, `v:18`, `Idempotency-Key` e timestamps usam Mono. Não abreviar IDs essenciais em recibos exportados.

## 04. Grid, Espaçamento & Geometria Proprietária

### Grade e ritmo

Grade fina de **32px** e mestra de **128px**; módulo construtivo **8u**. O `u` da marca é unidade vetorial, não equivale obrigatoriamente a um CSS pixel no logo escalado. Calibração usa linhas discretas, sem competir com texto. `--gutter: clamp(20px, 4.2vw, 72px)` e `--container: 1720px`, incluindo o padding do contêiner `border-box`.

Espaçamentos: **0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 76px**. Os pontos de 4/12/20px refinam o módulo; não exigir múltiplos de 8 onde o MIV/`DESIGN.md` já usa outra medida. Tokens oficiais de espaçamento do resumo: XS 8, SM 12, MD 20, LG 40, XL 76.

O workbench usa índice lateral em desktop, índice em grade no tablet/celular e tabelas com rolagem local. Pontos de adaptação próprios: 1150, 850 e 560px; o aplicativo preserva seus pontos existentes. Inspecionar 1440, 768 e 390px; também testar largura estreita sem mascarar overflow com `overflow-x: hidden`.

### Os cinco gestos construtivos

1. **Abertura K.** Grade `64u × 64u`; módulo `8u`; traço `8u`; proteção mínima de `16u` em todos os lados. Moldura aberta no quadrante superior direito: `M40 4H4V60H60V24`. K interno: `M18 16H26V48H18ZM26 28L40 16H51L34 32ZM26 36L35 30L51 48H40Z`. Cor única Grafite sobre Papel, ou Papel sobre Grafite. Não esticar nem fechar a abertura. Redução recomendada ≥24px; absoluta 16px para favicon, recomendação do MIV sem ensaio impresso.
2. **Corte de Tempo.** `.cut` faz chanfro de `12px` somente no canto superior direito. A variante monumental de `17px` é prevista no MIV, não o padrão do app. Os três demais cantos são secos, a 90°. Não recortar o foco de uma ação com a mídia.
3. **Passe-partout técnico.** Borda externa `1px solid var(--ink)`; respiro de `8px` em Papel; contorno da mídia `1px solid rgb(0 0 0 / .16)` com `outline-offset: -1px`. Esse contorno pertence à imagem/canvas, não ao card inteiro. Não ampliar a obra no hover: o respiro precisa continuar sendo 8px.
4. **Ficha registral.** Linha abaixo da obra em Mono, 9–10px, tracking 0,03em; `// K—NNN`, padrão `ERC-721` / `ERC-1155`, versão monotônica `v:N`. Badge de versão tem fundo Grafite e texto Papel, raio zero. Não usar código como mero enfeite sem correspondência com o registro.
5. **Raios concêntricos.** Obra/moldura com raio **0**. Controles internos com **6px**; container externo com **14px** e respiro de **8px**: `14 = 6 + 8`. A fórmula se aplica a controles aninhados; botão isolado não recebe padding extra só para repetir a demonstração.

```css
.cut {
  clip-path: polygon(0 0, calc(100% - var(--cut)) 0,
    100% var(--cut), 100% 100%, 0 100%);
}
.art-frame { border: var(--border-structure); padding: var(--frame-padding); }
.art-frame img { outline: 1px solid var(--media-outline); outline-offset: -1px; }
/* O botão focalizável fica fora do elemento recortado. */
```

## 05. Catálogo de Componentes & Anatomia de Estados

### Contrato comum de estados

| Estado | Contrato |
| --- | --- |
| `default` | Papel, tinta legível, borda no papel apropriado ao componente. |
| `hover` | Reforço de borda/Placa; variante primária continua Cobalto; não ampliar a obra. |
| `active` | Resposta curta `scale(.97–.99)` em controles; seleção persistente indicada por `aria-pressed`. |
| `focus-visible` | Anel duplo fora do recorte; não confundir com seleção; acionado pelo teclado. |
| `disabled` | `disabled` nativo, Placa/Grafite, nenhuma ação, cursor indisponível. Não depender só de opacidade. |
| `loading/shimmer` | Rótulo explícito, `aria-busy`, impedir reenvio e preservar dimensão; skeleton não é botão. |
| `error/stale` | Óxido + mensagem escrita + associação acessível; confirmação bloqueada até resolução explícita. |

O seletor no workbench fixa amostras visuais de estado. O estado `focus-visible` fixado é uma **simulação visual**; o foco real continua dependente de Tab. Estados de wrappers estáticos não recebem interatividade artificial. A matriz abaixo define quando um estado pertence à ação adjacente.

### Botões / `.btn`, `.btn.primary`, `.btn.ink`, `.btn.danger`

Anatomia: alvo mínimo de 46px de altura e 44px de largura, padding `11px 18px`, gap `12px`, borda de 1px, raio de 6px, Manrope 700 / 12px / 1,2. `type="button"` fora do envio de formulário; `type="submit"` apenas para envio. Ícone decorativo não substitui rótulo. Secundário usa Papel/Grafite/Linha; primário Cobalto/Papel; ink Grafite/Papel; danger Papel/Óxido para resolver um impedimento. Óxido não vira um CTA de promoção.

| Estado | Secundário | Primary | Ink | Danger |
| --- | --- | --- | --- | --- |
| Default | Papel / Grafite / Linha | Cobalto / Papel | Grafite / Papel | Papel / Óxido |
| Hover | Placa, borda Grafite | Mesma cor funcional, camada interna escura discreta | Mantém Grafite, reforça borda | Mantém Papel, reforça contorno Óxido |
| Active | Escala 0,97 | Escala 0,97 | Escala 0,97 | Escala 0,97 |
| Focus-visible | Anel duplo comum | Mesmo | Mesmo | Mesmo |
| Disabled | Placa/Grafite; sem click | Mesmo | Mesmo | Mesmo |
| Loading | Desabilitado + “Processando…” + aria-busy | Mesmo | Mesmo | Mesmo |
| Error/stale | Mensagem no contexto; bloqueia ações dependentes | Confirmação travada | Consulta pode permanecer disponível se independente | Ação explícita de revisão pode permanecer disponível |

### Moldura / `.art-frame.cut`

Anatomia: Gesto 02 + Gesto 03, mídia com dimensões/aspect-ratio conhecidos para evitar salto, ficha separada. `figure` + `figcaption` quando sem ação. Alt text descreve a obra; imagens meramente redundantes podem usar alt vazio no contexto apropriado.

| Estado | Regra |
| --- | --- |
| Default | 1px externo + 8px Papel + 1px interno, chanfro 12px, raio zero. |
| Hover / active | A moldura não muda proporção nem amplia a mídia; resposta pertence à ação do card. |
| Focus-visible | Moldura estática não recebe Tab; foco na ação externa ao clip-path. |
| Disabled | Contexto indica “Indisponível”; preservar leitura da obra. |
| Loading | Skeleton no mesmo aspect-ratio; `aria-busy` no contexto e texto “Carregando obra”. |
| Error/stale | Falha de mídia com descrição e tentativa novamente; stale da cotação não recolore a obra. |

### Card de catálogo / `.nft-card`

Anatomia: moldura → ficha → título Barlow → autoria/metadados → preço Mono → ação de detalhe/favorito. Evitar controles interativos aninhados dentro de outro botão/link. Favorito usa botão com `aria-pressed`; rótulo explicita a operação.

| Default | Hover | Active | Focus-visible | Disabled | Loading | Error/stale |
| --- | --- | --- | --- | --- | --- | --- |
| Ficha + preço + ação | Reforça estrutura/ação; mídia estável | Favorito persiste via aria-pressed | Ação externa à moldura | Ação travada, obra legível | Mesma geometria, contexto ocupado | Mensagem inline + recuperar; jamais comprar com cotação vencida |

### Seletor / `.edition-card`

Anatomia: botão de largura total, nome, padrão, estoque/limite, preço. Contorno Linha, padding `14px 16px`, raio 6px; selecionado usa 2px Grafite/Placa, texto Grafite. Escolhas exclusivas agrupadas com nome acessível; o app usa botões `aria-pressed`.

| Default | Hover | Active | Focus-visible | Disabled | Loading | Error/stale |
| --- | --- | --- | --- | --- | --- | --- |
| 1px Linha/Papel | Placa/Grafite | Selecionado = aria-pressed true; 2px Grafite | Anel comum, fora do contorno | Esgotada escrita, disabled nativo | Congela troca enquanto operação depende dela | Trava seleção dependente, explica conflito e permite recarregar |

Trocar edição restaura quantidade a 1. Seleção não é consentimento automático a uma nova cotação. Texto Legenda em Placa é substituído por Grafite.

### Quantidade inteira / `.stepper`

Anatomia: decremento de 44×44px, `output` Mono central ≥34px, incremento de 44×44px. Limites por estoque e por colecionador; sem frações. Rótulos acessíveis “Diminuir quantidade” / “Aumentar quantidade”. Output associado ao rótulo; atualizações anunciadas com moderação.

| Default | Hover | Active | Focus-visible | Disabled | Loading | Error/stale |
| --- | --- | --- | --- | --- | --- | --- |
| 1 até min(estoque,limite) | Botão recebe Placa | Botão Grafite/Papel; muda em 1 | Foco independente em − e + | − no mínimo, + no máximo; todos se esgotado | Congela controles dependentes | Congela e informa revisão; nunca normaliza silenciosamente uma compra |

### Inputs & formulários / `.field-input`, `.field-error`

Anatomia: rótulo explícito `htmlFor`, altura ≥44px, padding `10px 12px`, borda Linha de 1px, raio 6px; valor Manrope 14px no workbench, Mono para dados exatos. Placeholder é exemplo, não rótulo. Nome, e-mail, senha e tokens têm semânticas distintas; desativar spellcheck quando a correção atrapalhar dados técnicos.

| Default | Hover | Active | Focus-visible | Disabled | Loading | Error/stale |
| --- | --- | --- | --- | --- | --- | --- |
| Valor e ajuda associados | Borda Grafite | Edição nativa | Anel duplo, sem remover outline | disabled, Placa/Grafite | readOnly ou disabled conforme operação; aria-busy no form | aria-invalid, borda Óxido, mensagem associada por aria-describedby |

Validar na submissão e após interação pertinente; preservar valor inválido para correção. `role="alert"` para erro novo, não em mensagens estáticas redundantes. Usar texto com a ação necessária. A demonstração valida mínimo de três caracteres e não envia dados. ETH com mais de 18 casas é rejeitado, nunca arredondado.

### Carimbos / `.stamp`, `.version-tag`, `.ws-pill`

`.stamp`: Mono 9,5px, borda seca 1px Grafite, Papel, padding `4px 8px`, nó 4px em **currentColor**, raio zero. `.version-tag`: Grafite/Papel, Mono 10px, padding `3px 7px`, nó 4px, `v:N`. `.ws-pill`: contexto técnico escuro com texto Papel; estado escrito CONECTADO / CONECTANDO / RECUPERAÇÃO VIA REST.

Estáticos: default é legível; hover, active, focus e disabled não se aplicam à própria informação. Quando houver ação, envolvê-la em botão e aplicar o contrato do botão. Loading mostra “CONECTANDO”; erro mostra “REST”/“FALHA”, sem inventar que o socket conectou. O verde de telemetria legado não integra a paleta mineral; no workbench o nó herda a tinta e a semântica fica no texto. Não anunciar toda oscilação do socket como alerta urgente.

### Trava semântica / `.stale-lock-banner`

Anatomia: borda 1px Óxido, texto Óxido/Papel; textura diagonal discreta de alerta; título `STALE_QUOTE`, motivo, versão nova, preço exato e ação **“Atualizar e aceitar nova cotação”**. A mensagem não depende da textura nem da cor.

| Estado | Comportamento |
| --- | --- |
| Default | Oculto quando a revisão é válida; não mostrar erro decorativo. |
| Hover / active / focus-visible | Contrato do botão de aceite; banner em si não é clicável. |
| Disabled | Confirmação permanece disabled até resolução; banner continua legível. |
| Loading | Busca nova cotação, bloqueia reenvio e anuncia atualização. |
| Error/stale | Evento nft.updated altera preço/versão → trava confirmação → mostra nova cotação → exige aceite explícito. Se falhar, manter a trava e oferecer recuperação. |

O workbench reproduz a máquina de consentimento localmente, sem disparar compra/API. No produto, cada revisão tem `Idempotency-Key` única; repetir a mesma chave recupera o mesmo `orderId` e snapshot, sem duplicar a compra. Uma nova revisão é nova intenção; não reusar indevidamente uma chave antiga. O Design System não reimplementa esse motor.

### Skeleton consciente / `.skeleton-shimmer`

Default de carregamento: Placa, brilho horizontal de **1.400ms**, mesma geometria do conteúdo futuro. Wrapper com `aria-busy` e rótulo escrito; barras puramente visuais podem ser `aria-hidden`. Hover/active/focus/disabled não se aplicam a barras estáticas. Ao terminar, substituir conteúdo e limpar ocupado; falha deve substituir o skeleton por mensagem e recuperação. Nunca deixar shimmer infinito representar um erro definitivo.

`prefers-reduced-motion: reduce`: remover animação e brilho, manter placa estática e estado textual. O botão do laboratório executa espera local de 1,4s e anuncia conclusão; o espécime de shimmer continua visível como documentação.

### Biblioteca `KronosIcon` / 20 sinais

Grade 24×24, traço 1,75px, nó 3×3px. Aberturas e diagonais de 45° fazem parte do vocabulário do conjunto, conforme SVGs originais; não afirmar que todo desenho usa literalmente o mesmo segmento diagonal. O catálogo preserva as geometrias existentes. `currentColor` faz a herança semântica; não tingir nós de cobalto em carimbos.

| Nome React | Função |
| --- | --- |
| `arrow-ne` | Ir, abrir, continuar |
| `collector` | Colecionador e conta |
| `coupon` | Cupom e código |
| `erc1155` | Edição múltipla |
| `erc721` | Edição única |
| `eth-wei` | Unidade monetária exata |
| `filter` | Filtrar critérios |
| `heart` | Favorito |
| `idempotency` | Integridade de operação |
| `network` | Rede |
| `quote-stale` | Cotação desatualizada |
| `receipt` | Recibo |
| `reset-seed` | Restaurar semente |
| `search` | Busca |
| `session-purge` | Limpar sessão |
| `socket-live` | Atualização em tempo real |
| `sort` | Ordenação |
| `vault` | Cofre |
| `version` | Versão monotônica |
| `wallet` | Carteira |

Uso: `<KronosIcon name="receipt" />`. O tipo é fechado nos 20 nomes, sem fallback silencioso para seta. Os SVGs React são `aria-hidden` e `focusable=false`. Em botões de ícone, o botão recebe `aria-label`, alvo 44×44 e foco; o SVG continua decorativo. O nó herda a cor de texto em default/hover/seleção/disabled; loading e erro pertencem ao contexto, não a uma animação arbitrária do ícone. `src/components/icons/kronos-icon-data.ts` é gerado exclusivamente de ativos locais confiáveis; não aceitar SVG de usuário nesse caminho.

## 06. Movimento, Acessibilidade & Do / Don't

### Movimento funcional

| Token | Valor | Uso |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.2, 0.75, 0.25, 1)` | Feedback de controle 160ms. |
| `--ease-spring` | `cubic-bezier(0.16, 1, 0.3, 1)` | Assentamento de entrada; não é oscilador físico. |
| `--duration-fast` | 160ms | Hover/active de controles. |
| `--duration-media` | 450ms | Reserva de transição de mídia; não autoriza zoom que destrói passe-partout. |
| `--duration-shimmer` | 1.400ms | Ciclo de skeleton. |

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  .skeleton-shimmer::after { display: none; }
}
```

Sem parallax, pulsação de urgência ou autoanimação sem função. Eventos importantes permanecem compreensíveis sem movimento. Redução de movimento inclui rolagem suave.

### Teclado, foco e toque

```css
:focus-visible {
  outline: 3px solid var(--action);
  outline-offset: 4px;
  box-shadow: 0 0 0 2px var(--paper);
}
```

Alvos KRONOS ≥**44×44px**, botões ≥46px de altura, `touch-action: manipulation`. Essa é a regra própria mais exigente; [SC 2.5.8 AA](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) trata 24px com exceções, e o tamanho aprimorado usa 44px. Não atribuir 44px universalmente ao mínimo AA.

Usar elementos nativos, ordem DOM coerente, link de pular para conteúdo, landmark `main`, `h1` único por página, seções com `h2`. Foco precisa ficar visível e sem obstrução do header; `scroll-margin-top` contempla a navegação. Usar `aria-current=page` nas rotas e `aria-current=location` no índice. Erros se ligam ao campo; sucesso/cópia usa status educado. Contraste, zoom, semântica e navegação precisam de avaliação conjunta.

### Certo / errado

| Certo | Errado |
| --- | --- |
| Arte livre, interface mineral | Usar pigmento da obra como novo fundo global |
| Cobalto em confirmação primária/foco | Badge decorativo cobalto, fundo de seção azul |
| Grafite sobre Placa | Legenda pequena sobre Placa |
| Fio como separador decorativo | Fio como contorno de input obrigatório |
| Wei BigInt, 18 casas na revisão | Number/float para dinheiro em ETH |
| Obra seca, chanfro superior direito | Cards de obra arredondados, sombra difusa |
| 8px de passe-partout em todos os estados | Zoom no hover que invade o respiro |
| Foco fora do clip-path | Anel cortado pelo chanfro |
| Atualizar e aceitar cotação | Reabilitar compra silenciosamente após evento |
| Erro escrito com recuperação | Indicar bloqueio só pela cor |
| Copiado somente após sucesso | Aviso de cópia sem verificar clipboard |

## Operação, exportação e governança

| Artefato | Papel | Origem / manutenção |
| --- | --- | --- |
| `MIV-OFICIAL.md` | Fonte de identidade | Preservada; decisões autorais existentes |
| `DESIGN.md` | Resumo compatível com design.md | Preservado e validado pelo comando pedido |
| `DESIGN_SYSTEM.md` | Especificação técnica v1.0 | Este contrato, com tabelas sincronizadas |
| `src/styles/design-tokens.dtcg.json` | Fonte de valores | Editar aqui; três camadas |
| `src/styles/tokens.css` | CSS consumido pelo produto | Gerado com ds:sync |
| `src/components/icons/KronosIcons.tsx` | API React dos 20 sinais | Consome dados gerados dos ativos originais |
| `src/features/design-system/DesignSystemPage.tsx` | Workbench vivo | `/design` e redirecionamento `/?view=design` |
| `kronos-design-system.html` | Artefato offline | Gerado do mesmo React, com fontes, ícones, CSS, JS e licenças |
| `scripts/sync-design-system.mjs` | Sincronização | Valida aliases e gera CSS/ícones |
| `scripts/build-design-system.mjs` | Empacotamento standalone | Sem CDN, sem MSW, sem backend |
| `public/fonts/*` e `src/styles/fonts.css` | Sete arquivos de fonte + três OFL | Google Fonts oficial; locais e incorporados no standalone |

Abrir HTML via `file://` ou iframe com scripts habilitados. Clipboard tenta API segura e depois seleção temporária; se o ambiente bloquear ambas, a UI oferece campo de cópia manual. Exportar CSS/JSON usa Blob; iframe precisa permitir downloads (`allow-downloads`) para salvar e `allow-scripts` para interatividade. Nenhum sistema pode ultrapassar a sandbox imposta pelo host. Navegação, contraste e inspeção continuam locais, sem rede.

Para alterar: atualizar DTCG → `npm run ds:sync` → revisar componentes → `npm run ds:standalone` → conferir docs → executar validação. Mudança de função, alias público ou geometria canônica exige revisão de versão maior; token adicional compatível usa menor; correção sem mudança de contrato usa patch. Novas regras devem apontar sua origem no MIV ou ser explicitadas como extensão proposta.

### Ajustes de alinhamento desta versão

O código anterior tinha gutter `18px/3.8vw/64px` e contêiner de 1680px. Foram alinhados ao `DESIGN.md`: `20px/4.2vw/72px` e 1720px. Nós de carimbo, contador do cofre e seleção de pagamento deixaram de consumir `--action`, por não serem CTA primário/foco. O zoom no hover da mídia foi removido para manter o passe-partout. Foco passou a afastamento de 4px. A biblioteca React anterior tinha apenas seis desenhos efetivos; agora usa os 20 ativos originais.

### Validação e limites

Comandos exigidos: `npx @google/design.md designmd lint DESIGN.md`, `npm test`, `npm run typecheck`, `npm run build`. A verificação funcional adicional usa Playwright para navegação, `/?view=design`, contraste, BigInt, validação, quantidade, stale/aceite, exportação, HTML sem rede, iframe, movimento reduzido e rotas existentes. Evidência atual é registrada em `docs/DESIGN-SYSTEM-VALIDATION.md`, sem alegar deploy ou aprovação humana.

## Apêndice A / Inventário canônico de tokens

Todos os valores, aliases e descrições exportados pelo DTCG. Raios têm tipo `dimension`; extensões preservam a categoria. Tipografia composta é expandida no JSON.

<!-- TOKENS:START -->
| Token | Tipo | CSS | Valor / alias |
| --- | --- | --- | --- |
| `primitive.color.paper` | color | --primitive-paper | `{"colorSpace":"srgb","components":[0.9411764705882353,0.9450980392156862,0.9294117647058824],"alpha":1,"hex":"#F0F1ED"}` |
| `primitive.color.plate` | color | --primitive-plate | `{"colorSpace":"srgb","components":[0.8666666666666667,0.8823529411764706,0.8705882352941177],"alpha":1,"hex":"#DDE1DE"}` |
| `primitive.color.ink` | color | --primitive-ink | `{"colorSpace":"srgb","components":[0.08627450980392157,0.11372549019607843,0.10588235294117647],"alpha":1,"hex":"#161D1B"}` |
| `primitive.color.muted` | color | --primitive-muted | `{"colorSpace":"srgb","components":[0.36470588235294116,0.40784313725490196,0.3803921568627451],"alpha":1,"hex":"#5D6861"}` |
| `primitive.color.line` | color | --primitive-line | `{"colorSpace":"srgb","components":[0.48627450980392156,0.5333333333333333,0.5019607843137255],"alpha":1,"hex":"#7C8880"}` |
| `primitive.color.action` | color | --primitive-action | `{"colorSpace":"srgb","components":[0.1843137254901961,0.30196078431372547,0.9215686274509803],"alpha":1,"hex":"#2F4DEB"}` |
| `primitive.color.error` | color | --primitive-error | `{"colorSpace":"srgb","components":[0.6196078431372549,0.1803921568627451,0.1411764705882353],"alpha":1,"hex":"#9E2E24"}` |
| `primitive.color.hair` | color | --primitive-hair | `{"colorSpace":"srgb","components":[0.08627450980392157,0.11372549019607843,0.10588235294117647],"alpha":0.18,"hex":"#161D1B"}` |
| `primitive.color.media-outline` | color | --media-outline | `{"colorSpace":"srgb","components":[0,0,0],"alpha":0.16,"hex":"#000000"}` |
| `primitive.font.display` | fontFamily | --display | `["Barlow Condensed","Arial Narrow","sans-serif"]` |
| `primitive.font.ui` | fontFamily | --ui | `["Manrope","Arial","sans-serif"]` |
| `primitive.font.mono` | fontFamily | --mono | `["IBM Plex Mono","Consolas","monospace"]` |
| `primitive.dimension.unit` | dimension | --unit | `{"value":8,"unit":"px"}` |
| `primitive.dimension.grid` | dimension | --grid | `{"value":32,"unit":"px"}` |
| `primitive.dimension.grid-major` | dimension | --grid-major | `{"value":128,"unit":"px"}` |
| `primitive.dimension.symbol` | dimension | --symbol-grid | `{"value":64,"unit":"px"}` |
| `primitive.dimension.protection` | dimension | --symbol-protection | `{"value":16,"unit":"px"}` |
| `primitive.dimension.symbol-min` | dimension | --symbol-min | `{"value":16,"unit":"px"}` |
| `primitive.dimension.symbol-recommended` | dimension | --symbol-recommended | `{"value":24,"unit":"px"}` |
| `primitive.dimension.cut` | dimension | --cut | `{"value":12,"unit":"px"}` |
| `primitive.dimension.cut-large` | dimension | --cut-large | `{"value":17,"unit":"px"}` |
| `primitive.dimension.frame-padding` | dimension | --frame-padding | `{"value":8,"unit":"px"}` |
| `primitive.dimension.stroke` | dimension | --stroke | `{"value":1,"unit":"px"}` |
| `primitive.dimension.icon-stroke` | dimension | --icon-stroke | `{"value":1.75,"unit":"px"}` |
| `primitive.dimension.icon-grid` | dimension | --icon-grid | `{"value":24,"unit":"px"}` |
| `primitive.dimension.icon-node` | dimension | --icon-node | `{"value":3,"unit":"px"}` |
| `primitive.dimension.touch` | dimension | --touch | `{"value":44,"unit":"px"}` |
| `primitive.dimension.button-height` | dimension | --button-height | `{"value":46,"unit":"px"}` |
| `primitive.dimension.focus-width` | dimension | --focus-width | `{"value":3,"unit":"px"}` |
| `primitive.dimension.focus-offset` | dimension | --focus-offset | `{"value":4,"unit":"px"}` |
| `primitive.dimension.focus-gap` | dimension | --focus-gap | `{"value":2,"unit":"px"}` |
| `primitive.dimension.gutter-min` | dimension | --gutter-min | `{"value":20,"unit":"px"}` |
| `primitive.dimension.gutter-max` | dimension | --gutter-max | `{"value":72,"unit":"px"}` |
| `primitive.dimension.container` | dimension | --container | `{"value":1720,"unit":"px"}` |
| `primitive.dimension.space-0` | dimension | --space-0 | `{"value":0,"unit":"px"}` |
| `primitive.dimension.space-1` | dimension | --space-1 | `{"value":4,"unit":"px"}` |
| `primitive.dimension.space-2` | dimension | --space-2 | `{"value":8,"unit":"px"}` |
| `primitive.dimension.space-3` | dimension | --space-3 | `{"value":12,"unit":"px"}` |
| `primitive.dimension.space-4` | dimension | --space-4 | `{"value":16,"unit":"px"}` |
| `primitive.dimension.space-5` | dimension | --space-5 | `{"value":20,"unit":"px"}` |
| `primitive.dimension.space-6` | dimension | --space-6 | `{"value":24,"unit":"px"}` |
| `primitive.dimension.space-8` | dimension | --space-8 | `{"value":32,"unit":"px"}` |
| `primitive.dimension.space-10` | dimension | --space-10 | `{"value":40,"unit":"px"}` |
| `primitive.dimension.space-12` | dimension | --space-12 | `{"value":48,"unit":"px"}` |
| `primitive.dimension.space-19` | dimension | --space-19 | `{"value":76,"unit":"px"}` |
| `primitive.dimension.cover-min` | dimension | --cover-min | `{"value":110,"unit":"px"}` |
| `primitive.dimension.cover-max` | dimension | --cover-max | `{"value":340,"unit":"px"}` |
| `primitive.dimension.showcase-min` | dimension | --showcase-min | `{"value":65,"unit":"px"}` |
| `primitive.dimension.showcase-max` | dimension | --showcase-max | `{"value":138,"unit":"px"}` |
| `primitive.radius.none` | dimension | --radius-none | `{"value":0,"unit":"px"}` |
| `primitive.radius.xs` | dimension | --radius-xs | `{"value":4,"unit":"px"}` |
| `primitive.radius.inner` | dimension | --radius-inner | `{"value":6,"unit":"px"}` |
| `primitive.radius.outer` | dimension | --radius-outer | `{"value":14,"unit":"px"}` |
| `primitive.duration.fast` | duration | --duration-fast | `{"value":160,"unit":"ms"}` |
| `primitive.duration.media` | duration | --duration-media | `{"value":450,"unit":"ms"}` |
| `primitive.duration.shimmer` | duration | --duration-shimmer | `{"value":1400,"unit":"ms"}` |
| `primitive.easing.out` | cubicBezier | --ease-out | `[0.2,0.75,0.25,1]` |
| `primitive.easing.spring` | cubicBezier | --ease-spring | `[0.16,1,0.3,1]` |
| `semantic.color.paper` | color | --paper | `"{primitive.color.paper}"` |
| `semantic.color.plate` | color | --plate | `"{primitive.color.plate}"` |
| `semantic.color.ink` | color | --ink | `"{primitive.color.ink}"` |
| `semantic.color.muted` | color | --muted | `"{primitive.color.muted}"` |
| `semantic.color.line` | color | --line | `"{primitive.color.line}"` |
| `semantic.color.action` | color | --action | `"{primitive.color.action}"` |
| `semantic.color.error` | color | --error | `"{primitive.color.error}"` |
| `semantic.color.hair` | color | --hair | `"{primitive.color.hair}"` |
| `semantic.dimension.gutter` | dimension | --gutter | `"{primitive.dimension.gutter-min}"` |
| `semantic.dimension.cover` | dimension | --type-cover | `"{primitive.dimension.cover-min}"` |
| `semantic.dimension.showcase` | dimension | --type-showcase | `"{primitive.dimension.showcase-min}"` |
| `semantic.typography.h1` | typography | — | `{"fontFamily":"{primitive.font.display}","fontSize":{"value":72,"unit":"px"},"fontWeight":700,"lineHeight":0.9,"letterSpacing":{"value":-1.8,"unit":"px"}}` |
| `semantic.typography.h2` | typography | — | `{"fontFamily":"{primitive.font.display}","fontSize":{"value":48,"unit":"px"},"fontWeight":600,"lineHeight":0.98,"letterSpacing":{"value":-0.96,"unit":"px"}}` |
| `semantic.typography.h3` | typography | — | `{"fontFamily":"{primitive.font.display}","fontSize":{"value":27,"unit":"px"},"fontWeight":600,"lineHeight":1.1,"letterSpacing":{"value":0,"unit":"px"}}` |
| `semantic.typography.body` | typography | — | `{"fontFamily":"{primitive.font.ui}","fontSize":{"value":14,"unit":"px"},"fontWeight":400,"lineHeight":1.65,"letterSpacing":{"value":0,"unit":"px"}}` |
| `semantic.typography.body-large` | typography | — | `{"fontFamily":"{primitive.font.ui}","fontSize":{"value":16,"unit":"px"},"fontWeight":400,"lineHeight":1.65,"letterSpacing":{"value":0,"unit":"px"}}` |
| `semantic.typography.button` | typography | — | `{"fontFamily":"{primitive.font.ui}","fontSize":{"value":12,"unit":"px"},"fontWeight":700,"lineHeight":1.2,"letterSpacing":{"value":0,"unit":"px"}}` |
| `semantic.typography.eth` | typography | — | `{"fontFamily":"{primitive.font.mono}","fontSize":{"value":16,"unit":"px"},"fontWeight":400,"lineHeight":1.5,"letterSpacing":{"value":0,"unit":"px"}}` |
| `semantic.typography.register` | typography | — | `{"fontFamily":"{primitive.font.mono}","fontSize":{"value":10,"unit":"px"},"fontWeight":400,"lineHeight":1.5,"letterSpacing":{"value":0.3,"unit":"px"}}` |
| `semantic.typography.eyebrow` | typography | — | `{"fontFamily":"{primitive.font.mono}","fontSize":{"value":11,"unit":"px"},"fontWeight":400,"lineHeight":1.5,"letterSpacing":{"value":0.77,"unit":"px"}}` |
| `semantic.border.structure` | border | --border-structure | `{"color":"{semantic.color.ink}","width":"{primitive.dimension.stroke}","style":"solid"}` |
| `semantic.border.control` | border | --border-control | `{"color":"{semantic.color.line}","width":"{primitive.dimension.stroke}","style":"solid"}` |
| `semantic.border.subtle` | border | --border-subtle | `{"color":"{semantic.color.hair}","width":"{primitive.dimension.stroke}","style":"solid"}` |
| `semantic.border.error` | border | --border-error | `{"color":"{semantic.color.error}","width":"{primitive.dimension.stroke}","style":"solid"}` |
| `component.button.background` | color | --button-background | `"{semantic.color.paper}"` |
| `component.button.foreground` | color | --button-foreground | `"{semantic.color.ink}"` |
| `component.button.border` | color | --button-border | `"{semantic.color.line}"` |
| `component.button.hover` | color | --button-hover | `"{semantic.color.plate}"` |
| `component.button.primary-background` | color | --button-primary-background | `"{semantic.color.action}"` |
| `component.button.primary-foreground` | color | --button-primary-foreground | `"{semantic.color.paper}"` |
| `component.button.ink-background` | color | --button-ink-background | `"{semantic.color.ink}"` |
| `component.button.danger-foreground` | color | --button-danger-foreground | `"{semantic.color.error}"` |
| `component.button.disabled-background` | color | --button-disabled-background | `"{semantic.color.plate}"` |
| `component.button.radius` | dimension | --button-radius | `"{primitive.radius.inner}"` |
| `component.button.height` | dimension | --button-min-height | `"{primitive.dimension.button-height}"` |
| `component.button.type` | typography | — | `"{semantic.typography.button}"` |
| `component.frame.padding` | dimension | --frame-padding | `"{primitive.dimension.frame-padding}"` |
| `component.frame.radius` | dimension | --frame-radius | `"{primitive.radius.none}"` |
| `component.frame.cut` | dimension | --frame-cut | `"{primitive.dimension.cut}"` |
| `component.frame.border` | border | --frame-border | `"{semantic.border.structure}"` |
| `component.frame.background` | color | --frame-background | `"{semantic.color.paper}"` |
| `component.input.border` | border | --input-border | `"{semantic.border.control}"` |
| `component.input.radius` | dimension | --input-radius | `"{primitive.radius.inner}"` |
| `component.input.error` | color | --input-error | `"{semantic.color.error}"` |
| `component.edition.selected-background` | color | --edition-selected-background | `"{semantic.color.plate}"` |
| `component.edition.selected-foreground` | color | --edition-selected-foreground | `"{semantic.color.ink}"` |
| `component.edition.radius` | dimension | --edition-radius | `"{primitive.radius.inner}"` |
| `component.stepper.height` | dimension | --stepper-height | `"{primitive.dimension.touch}"` |
| `component.stepper.radius` | dimension | --stepper-radius | `"{primitive.radius.inner}"` |
| `component.badge.version-background` | color | --badge-version-background | `"{semantic.color.ink}"` |
| `component.badge.version-foreground` | color | --badge-version-foreground | `"{semantic.color.paper}"` |
| `component.badge.radius` | dimension | --badge-radius | `"{primitive.radius.none}"` |
| `component.stale.foreground` | color | --stale-foreground | `"{semantic.color.error}"` |
| `component.stale.background` | color | --stale-background | `"{semantic.color.paper}"` |
| `component.skeleton.background` | color | --skeleton-background | `"{semantic.color.plate}"` |
| `component.skeleton.duration` | duration | --skeleton-duration | `"{primitive.duration.shimmer}"` |
<!-- TOKENS:END -->
