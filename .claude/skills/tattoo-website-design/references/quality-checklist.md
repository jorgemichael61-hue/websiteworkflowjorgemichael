# Qualidade, acessibilidade, SEO, performance e lançamento

## 1. QA automático

```bash
# uma vez por máquina
npm i -D playwright && npx playwright install chromium
# servir o site e correr o script da skill
npx serve . -l 4173 &          # ou python3 -m http.server 4173
node .claude/skills/tattoo-website-design/scripts/qa.mjs http://localhost:4173/ ./qa-output
```

O script tira screenshots (390 / 768 / 1440 px, página inteira), lista erros e avisos da consola, pedidos falhados (imagens/fontes em falta), links internos partidos, imagens sem `alt`, `<h1>` em falta/duplicado, scroll horizontal e alvos de toque pequenos. **Abrir e olhar para os screenshots** — o script não avalia estética.

## 2. Revisão visual (com os screenshots à frente)

- [ ] Desktop, tablet e mobile: nada cortado, nada a sair do ecrã, sem scroll horizontal.
- [ ] Hero lê-se em 3 segundos: quem, o quê, onde, ação.
- [ ] Alinhamentos: bordas esquerdas comuns, espaços entre secções consistentes.
- [ ] Tipografia: hierarquia clara, sem viúvas feias em títulos, linhas ≤ 75 caracteres.
- [ ] Imagens: recorte consistente, mesma temperatura de cor, nenhuma pixelizada ou esticada.
- [ ] Não parece template: há um elemento de assinatura, ritmo variado, copy específica.
- [ ] Estados: hover, foco, ativo, desativado, a carregar, erro, sucesso — todos desenhados.
- [ ] Menu mobile abre, fecha, fecha com Esc, foco gerido.

## 3. Acessibilidade (WCAG 2.2 AA)

- [ ] Contraste texto ≥ 4.5:1 (≥ 3:1 para texto grande ≥ 24px e componentes de UI).
- [ ] Tudo funciona só com teclado; foco sempre visível; ordem lógica.
- [ ] "Saltar para o conteúdo" no topo.
- [ ] Um `<h1>`; títulos por ordem; landmarks (`header`, `nav`, `main`, `footer`).
- [ ] Imagens com alt descritivo (o que é a tatuagem, zona, estilo); decorativas com `alt=""`.
- [ ] Campos com `<label>`, erros ligados por `aria-describedby`, `aria-invalid`.
- [ ] Alvos de toque ≥ 44×44px (mínimo 24×24 pela WCAG 2.2).
- [ ] `prefers-reduced-motion` respeitado; nada pisca.
- [ ] `lang` correto no `<html>`.

## 4. SEO on-page

- [ ] `<title>` único (≤ 60 car.): "Estilo/serviço em Cidade | Nome".
- [ ] Meta description (≤ 155 car.) com cidade e proposta.
- [ ] URL canónico, Open Graph (título, descrição, imagem 1200×630), Twitter card.
- [ ] JSON-LD `TattooParlor` (ou `LocalBusiness`) com nome, morada, telefone, horário, geo, `sameAs` (Instagram), `priceRange`.
- [ ] `sitemap.xml` + `robots.txt`; páginas por estilo/localização quando há conteúdo real.
- [ ] Texto real (não em imagens); nomes de estilos e bairro naturalmente no copy.
- [ ] Ficheiros de imagem com nomes descritivos (`fine-line-moth-forearm.webp`).
- [ ] Google Business Profile do cliente ligado ao site (configuração externa).

## 5. Performance

- [ ] Imagens: WebP/AVIF, `srcset` + `sizes`, máx. ~250 KB no hero, ~120 KB por miniatura.
- [ ] `loading="lazy"` e `decoding="async"` abaixo da dobra; hero com `fetchpriority="high"`.
- [ ] `width`/`height` ou `aspect-ratio` em todas as imagens (CLS ≈ 0).
- [ ] Fontes self-hosted, subconjunto, `font-display: swap`, `preload` da principal.
- [ ] JS mínimo, `defer`; sem bibliotecas pesadas para coisas que o CSS faz.
- [ ] Lighthouse mobile: Performance ≥ 90, Acessibilidade ≥ 95, SEO ≥ 95 (verificar no site publicado).

## 6. Otimização de imagens (receita)

```js
// optimize.mjs — npm i -D sharp ; node optimize.mjs foto.jpg
import sharp from "sharp";
const src = process.argv[2], base = src.replace(/\.\w+$/, "");
for (const w of [640, 960, 1600]) {
  await sharp(src).rotate().resize({ width: w, withoutEnlargement: true })
    .webp({ quality: 72 }).toFile(`${base}-${w}.webp`);   // .rotate() aplica a orientação; EXIF não é copiado
}
```

- Fotografar/pedir fotos com luz natural, fundo limpo, tatuagem cicatrizada quando possível.
- Recortar para os rácios do sistema antes de exportar.
- Remover metadados EXIF (localização!).

## 7. Testes funcionais

- [ ] Todos os links e botões levam a algum lado (sem `href="#"` vazios).
- [ ] `tel:` e `mailto:` corretos; mapa abre a morada certa.
- [ ] Formulário: validação, mensagens de erro, envio real recebido no email do cliente (se ligado), sucesso mostra próximo passo.
- [ ] Uploads: tipos e tamanho limitados, pré-visualização, remover.
- [ ] 404 personalizada (quando o alojamento permite).
- [ ] Sem erros na consola; sem pedidos 404.

## 8. Checklist final de lançamento

- [ ] Conteúdo aprovado pelo cliente (nomes, preços, políticas, horário, morada).
- [ ] Fotos com direitos verificados; stock rotulado ou substituído por fotos reais.
- [ ] Domínio + HTTPS a funcionar (sem redirecionamentos para http).
- [ ] Formulário ligado e testado com envio real; email de resposta configurado.
- [ ] Política de privacidade e cookies (RGPD / UK GDPR); banner só se houver cookies não essenciais.
- [ ] Analytics respeitador de privacidade (Plausible, Cloudflare Web Analytics) se o cliente quiser.
- [ ] Favicon, `og:image`, título e descrição a aparecer bem ao partilhar no WhatsApp/Instagram.
- [ ] Sitemap submetido no Google Search Console; Google Business Profile com link.
- [ ] Footer com ano atual, contactos e redes certas.
- [ ] Backup / repositório entregue; instruções simples de edição para o cliente.
