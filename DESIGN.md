---
version: alpha
name: KRONOS // ARCHIVE
description: Identidade viva de galeria e instrumento de precisão para coleção de arte digital. Baseada em Papel de Arquivo (#F0F1ED), Grafite Mineral (#161D1B), Cobalto de Ação (#2F4DEB) e tipografia Barlow Condensed + Manrope + IBM Plex Mono.
colors:
  primary: "#2F4DEB"
  secondary: "#5D6861"
  tertiary: "#9E2E24"
  neutral: "#F0F1ED"
  surface-plate: "#DDE1DE"
  ink: "#161D1B"
  line-control: "#7C8880"
typography:
  h1:
    fontFamily: Barlow Condensed
    fontSize: 4.5rem
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.025em"
  h2:
    fontFamily: Barlow Condensed
    fontSize: 3rem
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  h3:
    fontFamily: Barlow Condensed
    fontSize: 1.6875rem
    fontWeight: 600
    lineHeight: 1.1
  body-md:
    fontFamily: Manrope
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.65
  mono-eth:
    fontFamily: IBM Plex Mono
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum' 1, 'zero' 1"
  mono-eyebrow:
    fontFamily: IBM Plex Mono
    fontSize: 0.6875rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.07em"
rounded:
  none: 0px
  xs: 4px
  sm: 6px
  lg: 14px
spacing:
  xs: 8px
  sm: 12px
  md: 20px
  lg: 40px
  xl: 76px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-secondary-hover:
    backgroundColor: "{colors.surface-plate}"
    textColor: "{colors.ink}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
    padding: 12px
  art-frame:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: 8px
  caption-register:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    typography: "{typography.mono-eyebrow}"
  version-badge:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.neutral}"
    typography: "{typography.mono-eyebrow}"
    rounded: "{rounded.none}"
    padding: 4px
  alert-stale-quote:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.tertiary}"
    rounded: "{rounded.none}"
    padding: 12px
  control-border-specimen:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.line-control}"
    rounded: "{rounded.lg}"
    padding: 8px
---

## Overview

**KRONOS // ARCHIVE** une a calma de um arquivo de museu (`#F0F1ED`) à precisão de um instrumento técnico (*teenage engineering OP-1*, *Analogue Pocket*, *OPX Studio*). A obra de arte digital tem autonomia cromática absoluta; a interface se mantém silenciosa em tons minerais e reserva o **Cobalto de Ação (`#2F4DEB`)** estritamente para chamadas de ação primárias e anéis de foco `:focus-visible`.

## Colors

- **Papel de Arquivo (`#F0F1ED`):** 60% da superfície — substitui o branco puro para eliminar ofuscamento e dar calor mineral às molduras.
- **Cinza de Placa (`#DDE1DE`):** Superfície técnica secundária para áreas de construção, skeletons e estados de hover.
- **Grafite Mineral (`#161D1B`):** 30% de estrutura e tinta — contraste AAA de `15.10:1` sobre Papel de Arquivo.
- **Cobalto de Ação (`#2F4DEB`):** $\le 10\%$ de presença — exclusivo para botões de confirmação primária e foco de teclado (`5.47:1` AA com `#F0F1ED`).
- **Óxido de Alerta (`#9E2E24`):** Sinal semântico de impedimento (cotação vencida via evento `nft.updated` ou conflito de idempotência).

## Typography

- **Barlow Condensed (`600`, `700`):** Presença escultural em títulos e manifestos com tracking comprimido (`-0.02em` a `-0.035em`).
- **Manrope (`400`, `600`, `700`):** Leitura confortável e controles de interface com `line-height: 1.65`.
- **IBM Plex Mono (`400`, `500`):** Exibição tabular (`tnum`, `zero`) de valores exatos em ETH (18 casas decimais), códigos `// K—NNN`, versões `v:N` e chaves de idempotência.

## Layout

- **Margens Fluidas (`--gutter: clamp(20px, 4.2vw, 72px)`):** Largura máxima de `1720px` com divisores horizontais de `1px solid #161D1B`.
- **Responsividade Verificada:** Adaptação estrutural em `1440px`, `768px` e `390px` sem overflow horizontal e com alvos de toque mínimos de `44px`.

## Elevation & Depth

- Sem sombras difusas nos cards: a separação entre planos ocorre pela diferença tonal entre `#F0F1ED` e `#DDE1DE`, bordas secas de `1px solid #161D1B` e contorno interno `1px solid rgba(0,0,0,0.16)` nas imagens.

## Shapes

- **Corte de Tempo (`.cut`):** Chanfro diagonal de `12px` no canto superior direito das molduras de obra (`border-radius: 0px`).
- **Raios Concêntricos nos Controles:** Controles interativos usam `6px` de raio interno dentro de containers de `14px` com `8px` de espaçamento (`14 = 6 + 8`).

## Components

- **`art-frame`:** Moldura arquivística com `1px solid #161D1B`, `8px` de passe-partout em `#F0F1ED`, chanfro superior direito e ficha registral `// K—NNN`.
- **`alert-stale-quote`:** Aviso em `#9E2E24` que trava o botão de compra no modal de checkout sempre que um evento `nft.updated` altera o preço ou versão da obra cotada.

## Do's and Don'ts

- **DO:** Manter a arte como única fonte de cor livre e usar `#2F4DEB` apenas em ações principais e foco `:focus-visible`.
- **DO:** Exibir valores em ETH com `IBM Plex Mono` (`tabular-nums`) preservando a precisão de 1 Wei (`BigInt`).
- **DON'T:** Usar fundo escuro roxo/índigo, cards com `border-radius: 24px` e sombras coloridas ou textos promocionais de escassez artificial.
- **DON'T:** Aplicar a cor Legenda (`#5D6861`) para texto pequeno sobre Cinza de Placa (`#DDE1DE`); sobre `#DDE1DE` use sempre Grafite Mineral (`#161D1B`).
