# Wren & Ash — site de demonstração

Estúdio de tatuagem **fictício** em Bristol (fine line e botânica), feito com a skill `tattoo-website-design`. Serve para mostrar a potenciais clientes o tipo de site que consegues entregar.

## Ver no computador

```bash
cd demos/wren-and-ash
python3 -m http.server 4173
# abrir http://localhost:4173
```

## Ficheiros

| Ficheiro | O que é |
|----------|---------|
| `index.html` | A página (conteúdo, SEO, dados estruturados) |
| `styles.css` | Todo o visual: cores, letras, layout |
| `main.js` | Menu mobile, filtros, lightbox, formulário |
| `fonts/` | Fontes alojadas no próprio site (licença SIL OFL em `OFL.txt`) |
| `img/flash/` | Desenhos de flash originais (SVG) — podes reutilizar |

## O conceito visual

Papel de stencil frio + a linha violeta que os tatuadores usam para transferir o desenho para a pele. A traça do topo "desenha-se" uma vez quando a página abre — é a única animação automática.

## Para transformar num site real

1. Trocar nome, morada, telefone, email, horário, preços e artistas.
2. Substituir **todas** as fotos do Unsplash por fotos do trabalho do cliente (e apagar a nota "Nota da demonstração").
3. Ligar o formulário: criar conta em [Formspree](https://formspree.io) (ou Netlify Forms), copiar o endpoint e colocá-lo em `data-endpoint=""` no `<form>` em `index.html`. Testar com um envio real. Envio de ficheiros pode exigir plano pago.
4. Apagar `<meta name="robots" content="noindex, nofollow">` e adicionar `<link rel="canonical" href="https://dominio-do-cliente/">`.
5. Atualizar `og:image` e o JSON-LD com o domínio real; criar `sitemap.xml` e `robots.txt`.
6. Correr o QA: `node .claude/skills/tattoo-website-design/scripts/qa.mjs http://localhost:4173/ qa-output`.

## Créditos das fotos (Unsplash License)

Haberdoedas, Allef Vinicius, Annie Spratt, Raspopova Marina, Yeganeh Shahpourzadeh, Agathè Lov — ligação a cada foto no próprio site.
