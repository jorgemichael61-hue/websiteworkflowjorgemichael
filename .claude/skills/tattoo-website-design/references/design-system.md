# Sistema de design

O código está em [../assets/tokens.css](../assets/tokens.css). Este ficheiro explica **como** e **porquê** usar cada parte.

## Stack recomendada

- **Por defeito:** HTML + CSS + JS simples, sem build. Aloja grátis (GitHub Pages, Netlify, Cloudflare Pages), carrega rápido, qualquer pessoa consegue editar.
- **Se o cliente quer editar galeria/artistas sozinho:** Astro + CMS headless (Decap, Sanity) ou WordPress com tema próprio leve.
- **Se o projeto já existe:** manter o framework existente; aplicar só os tokens.

## Tokens de cor

| Token | Função | Regra |
|-------|--------|-------|
| `--c-bg` | fundo da página | tirar das fotos do artista (papel, pele, parede do estúdio) |
| `--c-surface` | blocos alternados, fundo de imagens a carregar | 4–8% mais escuro/claro que o fundo |
| `--c-ink` | texto principal | contraste ≥ 7:1 com o fundo |
| `--c-ink-soft` | texto secundário | ≥ 4.5:1 — testar sempre |
| `--c-line` | divisórias, bordas de campos | decorativo; bordas de inputs precisam ≥ 3:1 se forem a única pista |
| `--c-accent` | CTA, links, detalhes | usar em < 10% da área; texto sobre ele ≥ 4.5:1 |

Presets prontos: `data-direction="dark" | "fineline" | "traditional"` no `<html>`.

## Tipografia

- **2 famílias no máximo:** display (personalidade) + texto (legibilidade). Uma terceira mono só para números/labels se fizer parte do conceito.
- **Escala fluida** com `clamp()` (h1 44→104px, h2 32→56, h3 22→28, corpo 17px).
- Corpo nunca < 16px; linhas 45–75 caracteres (`--measure: 62ch`).
- Títulos display grandes com `letter-spacing` negativo leve; labels em maiúsculas com `0.14em`.
- **Self-host** das fontes (WOFF2/WOFF + `font-display: swap`) e `preload` da fonte do hero. Subconjunto latino (+ acentos PT/ES/FR) reduz tamanho.

Pares testados:

| Direção | Display | Texto |
|---------|---------|-------|
| Luxo / editorial | Instrument Serif | Instrument Sans |
| Fine line | Italiana ou Cormorant Garamond | Work Sans |
| Dark / blackwork | Big Shoulders Display | Inter |
| Tradicional | Young Serif / Erica One (só títulos) | Lora |
| Estúdio grande | Bricolage Grotesque | Inter |

## Espaçamento e layout

- Escala de 4px (`--s-1` … `--s-10`).
- Entre secções: `--section-y` (64→128px). Dentro de secções: múltiplos de 8.
- Container 1240px + `--gutter` fluido (16→40px).
- Grelha: 4 colunas mobile, 12 desktop (via CSS grid); breakpoints **600 / 900 / 1200 px**, mobile-first.

## Componentes

- **Botões:** primário (acento cheio) e fantasma (contorno). Altura ≥ 48px. Um só primário por ecrã.
- **Formulário:** label visível por cima, hint por baixo, erro em texto (não só cor), campos de 16px+.
- **Cartão de artista:** imagem 3:4 → nome → especialidades → estado da agenda → 2 ações.
- **Galeria:** 2 colunas mobile / 3 desktop, 4:5, uma peça larga (`.is-wide`) a quebrar o ritmo; legenda pequena (estilo · zona · artista). Lightbox com `<dialog>`, setas, Esc e foco preso.
- **Navegação:** header sticky fino; desktop links + botão "Marcar"; mobile botão de menu com `aria-expanded` e painel a ecrã inteiro; CTA de marcação também visível no mobile.
- **FAQ:** `<details>/<summary>` (acessível nativamente).

## Rácios de imagem

| Uso | Desktop | Mobile |
|-----|---------|--------|
| Hero | 16:9 ou 3:2 | 4:5 |
| Portfólio | 4:5 | 4:5 |
| Detalhe/close-up | 1:1 | 1:1 |
| Artista | 3:4 | 3:4 |
| Estúdio/ambiente | 3:2 | 4:3 |

Definir sempre `width`/`height` ou `aspect-ratio` → zero saltos de layout (CLS).

## Movimento

- Propósito: orientar o olhar, dar feedback, sugerir qualidade. Nunca decorar por decorar.
- Durações 160ms (hover) / 320ms (UI) / 700ms (revelar secção). Curva `--ease-out`.
- Só `opacity` e `transform` (performance). Revelar uma vez, deslocamento ≤ 16px.
- `prefers-reduced-motion: reduce` desliga tudo. Sem JS, conteúdo visível.
- Proibido: parallax pesado, cursores personalizados, loaders de ecrã inteiro, carrosséis automáticos.
