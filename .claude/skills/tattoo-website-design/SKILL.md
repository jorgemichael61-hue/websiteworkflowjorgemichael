---
name: tattoo-website-design
description: Desenhar, construir e testar sites premium para estúdios de tatuagem, tatuadores independentes e estúdios de piercing. Usar quando o pedido envolve um site, landing page, portfólio, página de marcação ou redesign para um negócio de tatuagem/piercing — inclui pesquisa de referências, escolha de direção visual, sistema de design, booking e QA.
argument-hint: "[nome do negócio ou URL do site atual]"
---

# Sites para estúdios de tatuagem

Objetivo: sites que **parecem feitos à medida**, mostram o trabalho do artista acima de tudo e levam o visitante a pedir uma marcação sem fricção. Cada secção tem de ter uma razão visual ou comercial para existir.

## Ficheiros desta skill (ler quando necessário)

- [references/reference-research.md](references/reference-research.md) — análise dos 10 sites de referência (EUA) e o que aprender com cada um.
- [references/design-patterns.md](references/design-patterns.md) — 8 direções de design por tipo de negócio (público, paleta, tipografia, estrutura, CTA).
- [references/design-system.md](references/design-system.md) — tokens, escalas, componentes, rácios de imagem, animação.
- [assets/tokens.css](assets/tokens.css) — ponto de partida em CSS para copiar para um projeto novo.
- [references/booking-ux.md](references/booking-ux.md) — jornada de marcação, formulário, depósitos, integrações.
- [references/quality-checklist.md](references/quality-checklist.md) — QA visual, acessibilidade, SEO, performance, checklist de lançamento.
- [scripts/qa.mjs](scripts/qa.mjs) — screenshots desktop/tablet/mobile + erros de consola + links partidos (Playwright).
- Exemplo completo construído com esta skill: `demos/wren-and-ash/` na raiz do repositório (fine line, Bristol, estúdio fictício).

## Fluxo de trabalho (seguir por ordem)

1. **Perceber o negócio.** Quem é o artista/estúdio, especialidade (fine line, blackwork, tradicional…), cidade, nº de artistas, se faz piercing, walk-ins ou só marcação, preços mínimos, depósito, política de cancelamento, idiomas. Se faltar algo essencial (nome, morada, como recebem marcações), perguntar — não inventar.
2. **Pesquisar.** Abrir o site atual, Instagram e 3–5 concorrentes locais. Registar só o que foi verificado; se um site não abre, anotar a limitação. Nunca copiar código, textos, logos, fotos ou arte.
3. **Escolher UMA direção** em `design-patterns.md`. A direção segue a marca e o estilo do artista — **não forçar tudo para "escuro"**. Fine line delicado pede luz e espaço; tradicional pede cor e peso.
4. **Inspecionar o projeto existente** antes de mexer: framework, alojamento (GitHub Pages, Netlify, WordPress, Wix…), domínio, ficheiros que não se podem partir. Não substituir o framework sem motivo. Sem projeto → HTML/CSS/JS estático (rápido, barato de alojar, fácil de manter) salvo necessidade real de CMS.
5. **Plano de design** (curto): direção, paleta, par tipográfico, ordem das secções, jornada de marcação, lista de imagens necessárias, integrações externas.
6. **Implementar** com os tokens de `assets/tokens.css` adaptados à marca.
7. **Testar** com `scripts/qa.mjs` + checklist; ver os screenshots e corrigir o que parecer genérico, desalinhado ou inacabado.
8. **Reportar** com honestidade: o que funciona, o que falta, o que precisa de configuração externa (email do formulário, pagamentos, domínio, Google Business).

## Princípios visuais

- **O trabalho é o herói.** Fotos de tatuagens grandes, nítidas, com recorte consistente. Texto curto à volta. Nada compete com o portfólio.
- **Uma ideia forte, não dez.** Escolher 1 elemento de assinatura (ex.: tipografia serifada enorme, moldura de "flash sheet", grão de papel, numeração editorial) e repeti-lo com disciplina.
- **Contraste e calma.** Fundo + tinta + 1 cor de acento. Acento só para ações e detalhes, nunca para grandes áreas.
- **Ritmo editorial.** Alternar secções largas (imagem a toda a largura) com secções estreitas de texto (máx. ~65 caracteres por linha).
- **Ir buscar a assinatura ao mundo da tatuagem:** linha violeta do stencil, folha de flash, papel de transferência, anotações à mão do artista, a própria obra digitalizada. É isto que impede o site de parecer template.
- **Sinais de "feito por IA" a evitar por defeito:** creme `#F4F1EA` + serifada + acento terracota; preto com um único acento néon; etiquetas em MAIÚSCULAS espaçadas por cima de cada título; "A · B · C" como meta; `→` em todos os botões; numeração 01/02/03 em conteúdo que não é sequência (usar só em passos reais); cartões todos iguais com a mesma sombra; animação de entrada em cada secção. Uma só animação memorável chega.
- **Evitar:** gradientes gratuitos, glassmorphism, grelhas de cartões todas iguais, ícones genéricos, animações sem propósito, stock "pessoa a sorrir ao portátil", texto de enchimento ("Bem-vindos ao nosso site").

## Estrutura de homepage por defeito (adaptar)

1. Header: logo, 4–6 links, botão "Marcar" sempre visível (sticky em mobile).
2. Hero: imagem forte de trabalho real + frase de posicionamento + CTA principal + CTA secundário (ver portfólio).
3. Prova rápida: estilos/especialidades, anos de experiência, avaliações reais (só se existirem).
4. Portfólio curado (8–12 peças) com filtro por estilo/artista quando há volume.
5. Artistas: foto ou marca visual, especialidades, estado da agenda, "Ver trabalho" + "Marcar com X".
6. Como funciona: 3–4 passos (pedido → proposta/orçamento → depósito → sessão).
7. Preços e políticas: mínimo, depósito, cancelamento — transparência reduz mensagens repetidas.
8. FAQ (acordeão acessível) + cuidados pós-tatuagem.
9. Visita: morada, mapa (link), horário, contactos, acessibilidade do espaço.
10. Footer: contactos, redes, políticas, idade mínima, créditos.

## Marcação (resumo — detalhes em booking-ux.md)

- Um CTA principal com o **mesmo texto** em todo o site ("Pedir marcação").
- Formulário curto: nome, email/telefone, artista (ou "recomendem-me"), ideia, local do corpo, tamanho aproximado, referências (upload), disponibilidade, confirmação de 18+, consentimento RGPD.
- Dizer o que acontece a seguir e em quanto tempo há resposta.
- **Nunca** apresentar um mockup como sistema de marcações funcional. Se o formulário não estiver ligado a um serviço (Formspree, Netlify Forms, Basin, backend próprio), mostrá-lo como "demo" e listar a configuração em falta.
- Pagamentos de depósito → Stripe Payment Links / Square / plataformas de booking (Fresha, Setmore, Square Appointments, Tattoodo). Nunca inventar credenciais.

## Requisitos não negociáveis

- **Responsivo** desde 360 px até 1440+ px; testar 390, 768 e 1440.
- **Acessibilidade WCAG 2.2 AA:** contraste ≥ 4.5:1 no texto, foco visível, navegação por teclado, labels reais nos campos, alt descritivo (o que a tatuagem mostra, onde, estilo), `prefers-reduced-motion` respeitado.
- **SEO local:** `<title>` e meta description únicos, um `<h1>`, schema `TattooParlor`/`LocalBusiness` com morada/horário/telefone, Open Graph, URL canónico, sitemap, nome da cidade nos títulos naturais.
- **Performance:** imagens WebP/AVIF com `srcset`, `width`/`height` definidos, `loading="lazy"` abaixo da dobra, hero com `fetchpriority="high"`, fontes self-hosted com `font-display: swap` (também evita enviar IPs para a Google — relevante no RGPD/UK GDPR), JS mínimo.
- **Direitos de imagem:** só fotos do cliente ou com licença verificada (ex.: Unsplash License) e crédito. Stock nunca é apresentado como trabalho do artista — rotular como "imagem ilustrativa" até haver fotos reais.

## Erros comuns a evitar

- Site lindo mas sem morada, horário ou preço mínimo → clientes desistem ou enchem a DM.
- Página de entrada "ENTER" ou splash sem conteúdo (mau para SEO e para mobile).
- Portfólio só via Instagram embed (lento, quebra, sem SEO).
- Alt text vazio ou "image1.jpg".
- Formulários de newsletter não configurados a mostrar erros ao público.
- Contradições (ex.: "desde 1993" num sítio e "desde '01" noutro; artistas no FAQ que não existem na equipa).
- Copyright do footer desatualizado; links `#` vazios; títulos duplicados ("Marca — Marca").
- Texto em CAPS e fontes finas sobre fotos sem overlay → ilegível.

## Antes de dizer "está pronto"

Correr a checklist de [references/quality-checklist.md](references/quality-checklist.md) — inclui a checklist final de lançamento. Ver os screenshots de verdade, não só o código.
