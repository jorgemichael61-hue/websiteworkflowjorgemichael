# Marcação e conversão

## Princípios

1. **Um caminho principal**, repetido com o mesmo texto: header, hero, fim de cada secção relevante, cartões de artista.
2. **Responder às 5 perguntas antes de o cliente as fazer:** quanto custa (mínimo/faixa), quanto é o depósito, quanto tempo esperam, como funciona, onde é.
3. **Pedir só o necessário** — cada campo extra custa pedidos. Campos opcionais marcados como opcionais.
4. **Dizer o que acontece depois** (ex.: "Respondemos em 2 dias úteis com proposta e link para o depósito").
5. **Ser honesto:** um formulário que não envia nada é um mockup — rotular como demo.

## Tipos de jornada

| Situação | Jornada recomendada |
|----------|--------------------|
| Custom (maioria) | Formulário de consulta → resposta com orçamento → depósito por link → data |
| Flash com preço fixo / piercing | Agendamento direto (Square Appointments, Fresha, Setmore, Calendly) com depósito no ato |
| Artista muito procurado | Agenda fechada por defeito + newsletter "aviso quando abrir" + formulário ativo só em janelas |
| Walk-ins | Horário e regras claras no topo; opcional "estado de hoje" atualizável |
| Estúdio com muitos artistas | "Escolher artista" ou "Recomendem-me" no formulário; botão "Marcar com X" pré-preenche via `?artista=x` |

## Formulário de consulta (campos)

Obrigatórios:
- Nome
- Email (e/ou telefone — escolher o canal preferido)
- Artista (lista + "Sem preferência / recomendem-me")
- A tua ideia (textarea, com exemplo de bom pedido no hint)
- Zona do corpo (select)
- Tamanho aproximado (cm ou comparação: moeda / cartão / palma / maior)
- Confirmação de idade 18+ (checkbox — UK: lei proíbe tatuar menores de 18)
- Consentimento RGPD para guardar os dados para responder ao pedido (checkbox, com link para a política de privacidade)

Opcionais:
- Imagens de referência (upload múltiplo; aceitar JPG/PNG/WEBP/HEIC; limite ~10 MB cada; mostrar pré-visualização e permitir remover)
- Cor ou preto e cinza
- Disponibilidade (dias/períodos)
- Orçamento aproximado
- Primeira tatuagem? (ajusta o tom da resposta)
- Como nos conheceste

UX:
- Labels visíveis, nunca só placeholder.
- Limpar o erro enquanto a pessoa escreve (`input`); mostrar erros ao sair do campo só **depois** do clique terminar — uma mensagem que aparece/desaparece no `blur` empurra o layout e faz falhar o clique no campo seguinte (bug real encontrado no demo).
- Validar ao sair do campo e ao submeter; mensagem de erro em texto junto ao campo + resumo no topo com links (`role="alert"`).
- Botão de envio com estado "A enviar…" (desativado) e mensagem de sucesso que diz o próximo passo.
- Anti-spam: honeypot escondido + rate limit do serviço (evitar CAPTCHAs agressivos).

## Integrações (sites estáticos)

| Necessidade | Opções | Notas |
|-------------|--------|-------|
| Enviar formulário por email (com uploads) | Formspree (planos pagos aceitam ficheiros), Netlify Forms (se alojar na Netlify), Basin, Getform | Requer conta do cliente; testar envio real antes de entregar |
| Depósito | Stripe Payment Links, Square, PayPal | Link enviado após aprovar o pedido, ou no agendamento direto |
| Agenda com disponibilidade | Square Appointments, Fresha, Setmore, Calendly + Stripe | Embutir ou link; garantir que funciona no mobile |
| Lembretes | Incluídos nas plataformas de agenda | Reduz faltas |
| Gift cards | Square, Stripe | Bom no Natal |

**Nunca** inventar API keys. Deixar o endpoint configurável (ex.: `data-endpoint` no `<form>`) e documentar o passo.

## Políticas a mostrar (secção "Preços e políticas")

- Mínimo da casa e/ou taxa horária/diária (faixas são suficientes).
- Depósito: valor, não reembolsável, descontado no preço final.
- Reagendamento/cancelamento: aviso mínimo (48–72h), o que acontece ao depósito.
- Atrasos (ex.: 15 min).
- Idade mínima e ID com foto.
- Acompanhantes, comida, saúde (não beber álcool antes, etc.).
- Desenhos: mostrados no dia ou enviados antes?
- Retoques: grátis até X meses?

## Sinais de confiança

- Fotos reais do estúdio e da equipa.
- Avaliações reais com fonte (Google, etc.) — nunca inventadas.
- Licenças/registos (UK: registo de pele no council local), higiene (agulhas descartáveis, autoclave).
- Imprensa, prémios, anos de experiência — apenas verificáveis e consistentes em todo o site.
- Morada, mapa, horário, telefone clicável (`tel:`), email (`mailto:`).
