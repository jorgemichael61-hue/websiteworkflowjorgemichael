// Wren & Ash — demo. JS sem dependências; o site funciona (lê-se e navega-se) sem ele.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Stencil do hero: desenha-se uma vez ---------- */
  $$(".draw path, .draw ellipse, .draw circle").forEach((el, i) => {
    const len = Math.ceil(el.getTotalLength ? el.getTotalLength() : 400);
    el.style.setProperty("--len", len);
    el.style.setProperty("--i", i);
  });

  /* ---------- Header ---------- */
  const header = $(".site-header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Menu mobile ---------- */
  const menu = $("#menu-mobile");
  const openBtn = $(".nav .nav__toggle");
  const closeBtn = $("[data-close-menu]");
  const openMenu = () => { menu.hidden = false; openBtn.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; closeBtn.focus(); };
  const closeMenu = (focusBack = true) => { menu.hidden = true; openBtn.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; if (focusBack) openBtn.focus(); };
  openBtn.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", () => closeMenu());
  $$("a", menu).forEach((a) => a.addEventListener("click", () => closeMenu(false)));
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
    if (e.key === "Tab") { // manter o foco dentro do menu
      const f = $$("a, button", menu); const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Filtros da galeria ---------- */
  const items = $$("#galeria > li");
  $$(".filter").forEach((btn) => btn.addEventListener("click", () => {
    $$(".filter").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    const f = btn.dataset.filter;
    items.forEach((li) => { li.hidden = f !== "todos" && li.dataset.style !== f; });
  }));

  /* ---------- Lightbox ---------- */
  const lb = $("#lightbox");
  const lbImg = $("img", lb);
  const lbCap = $(".lightbox__caption", lb);
  let current = 0, opener = null;
  const visiblePieces = () => items.filter((li) => !li.hidden).map((li) => $(".piece", li));
  const show = (i) => {
    const list = visiblePieces();
    current = (i + list.length) % list.length;
    const p = list[current];
    lbImg.src = p.dataset.full;
    lbImg.alt = $("img", p).alt;
    lbCap.innerHTML = "";
    lbCap.append(`${$(".piece__cap", p).textContent}. Foto ilustrativa: `);
    const a = document.createElement("a");
    a.href = p.dataset.creditUrl; a.rel = "noopener"; a.textContent = p.dataset.credit;
    lbCap.append(a);
  };
  if (typeof lb.showModal === "function") {
    $$(".piece").forEach((p) => p.addEventListener("click", () => {
      opener = p; show(visiblePieces().indexOf(p)); lb.showModal(); $("[data-lb=close]", lb).focus();
    }));
    lb.addEventListener("click", (e) => {
      const act = e.target.closest("[data-lb]")?.dataset.lb;
      if (act === "prev") show(current - 1);
      if (act === "next") show(current + 1);
      if (act === "close" || e.target === lb) lb.close();
    });
    lb.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
    lb.addEventListener("close", () => opener?.focus());
  }

  /* ---------- Pré-preencher o formulário (artista / flash / ?artista=) ---------- */
  const artistSel = $("#artista");
  const flashSel = $("#flash-escolhido");
  $$("[data-artist]").forEach((a) => a.addEventListener("click", () => { artistSel.value = a.dataset.artist; }));
  $$("[data-flash]").forEach((a) => a.addEventListener("click", () => {
    flashSel.value = a.dataset.flash;
    if (!artistSel.value) artistSel.value = "recomendem";
  }));
  const qsArtist = new URLSearchParams(location.search).get("artista");
  if (qsArtist && $(`option[value="${CSS.escape(qsArtist)}"]`, artistSel)) artistSel.value = qsArtist;

  /* ---------- Referências: pré-visualização ---------- */
  const fileInput = $("#referencias-input");
  const thumbs = $("#thumbs");
  const drop = $("#dropzone");
  const MAX_FILES = 5, MAX_MB = 10;
  let files = [];
  const fileErr = $("#referencias-erro");
  const renderThumbs = () => {
    thumbs.innerHTML = "";
    files.forEach((f, i) => {
      const li = document.createElement("li");
      const img = document.createElement("img");
      img.alt = `Referência: ${f.name}`;
      if (/^image\/(jpeg|png|webp)$/.test(f.type)) img.src = URL.createObjectURL(f);
      else img.src = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 84"><rect width="84" height="84" fill="#3A3E44"/><text x="42" y="47" fill="#EEF0EB" font-size="12" text-anchor="middle" font-family="sans-serif">HEIC</text></svg>');
      const rm = document.createElement("button");
      rm.type = "button"; rm.textContent = "×"; rm.setAttribute("aria-label", `Remover ${f.name}`);
      rm.addEventListener("click", () => { files.splice(i, 1); renderThumbs(); fileInput.focus(); });
      li.append(img, rm); thumbs.append(li);
    });
  };
  const addFiles = (list) => {
    const msgs = [];
    for (const f of list) {
      if (files.length >= MAX_FILES) { msgs.push(`Máximo de ${MAX_FILES} imagens.`); break; }
      if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) && !/\.heic$/i.test(f.name)) { msgs.push(`${f.name}: formato não aceite (usa JPG, PNG, WEBP ou HEIC).`); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { msgs.push(`${f.name}: tem mais de ${MAX_MB} MB.`); continue; }
      files.push(f);
    }
    fileErr.textContent = msgs.join(" ");
    renderThumbs();
  };
  fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  /* ---------- Validação e envio ---------- */
  const form = $("#form-marcacao");
  const summary = $("#form-erros");
  const result = $("#form-resultado");
  const rules = [
    { id: "nome", test: (v) => v.trim().length >= 2, msg: "Escreve o teu nome." },
    { id: "email", test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), msg: "Escreve um email válido, por exemplo nome@exemplo.com." },
    { id: "artista", test: (v) => v !== "", msg: "Escolhe um artista ou \"Sem preferência\"." },
    { id: "ideia", test: (v) => v.trim().length >= 20, msg: "Descreve a ideia em pelo menos 20 caracteres." },
    { id: "zona", test: (v) => v !== "", msg: "Escolhe a zona do corpo." },
    { id: "tamanho", radio: true, msg: "Escolhe um tamanho aproximado." },
    { id: "idade", check: true, msg: "Confirma que tens 18 anos ou mais." },
    { id: "privacidade", check: true, msg: "Precisamos da tua autorização para guardar os dados do pedido." },
  ];
  const validateRule = (r) => {
    let ok, field;
    if (r.radio) { const radios = $$(`input[name="${r.id}"]`, form); ok = radios.some((x) => x.checked); field = radios[0]; radios.forEach((x) => x.setAttribute("aria-invalid", String(!ok))); }
    else { field = $(`#${r.id}`); ok = r.check ? field.checked : r.test(field.value); field.setAttribute("aria-invalid", String(!ok)); }
    $(`#${r.id}-erro`).textContent = ok ? "" : r.msg;
    return { ok, field, msg: r.msg };
  };
  rules.forEach((r) => {
    const els = r.radio ? $$(`input[name="${r.id}"]`, form) : [$(`#${r.id}`)];
    els.forEach((el) => {
      if (r.radio || r.check || el.tagName === "SELECT") { el.addEventListener("change", () => validateRule(r)); return; }
      // Ao escrever: limpar o erro assim que o campo fica válido.
      el.addEventListener("input", () => { if (el.getAttribute("aria-invalid") === "true") validateRule(r); });
      // Ao sair do campo: mostrar o erro, mas só depois do clique que causou a saída
      // (senão a mensagem empurra o layout e o clique falha no elemento seguinte).
      el.addEventListener("blur", () => { if (el.value) afterPointer(() => validateRule(r)); });
    });
  });
  let pointerIsDown = false, pending = [];
  document.addEventListener("pointerdown", () => { pointerIsDown = true; }, true);
  document.addEventListener("pointerup", () => {
    pointerIsDown = false;
    setTimeout(() => { pending.forEach((fn) => fn()); pending = []; }, 0);
  }, true);
  function afterPointer(fn) { if (pointerIsDown) pending.push(fn); else fn(); }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if ($("#website").value) return; // honeypot: bot
    const results = rules.map(validateRule);
    const bad = results.filter((r) => !r.ok);
    const list = $("ul", summary);
    list.innerHTML = "";
    if (bad.length) {
      bad.forEach((b) => {
        const li = document.createElement("li"); const a = document.createElement("a");
        a.href = `#${b.field.id}`; a.textContent = b.msg;
        a.addEventListener("click", (ev) => { ev.preventDefault(); b.field.focus(); });
        li.append(a); list.append(li);
      });
      summary.hidden = false; summary.focus();
      return;
    }
    summary.hidden = true;

    const btn = $("button[type=submit]", form);
    btn.disabled = true; btn.textContent = "A enviar…";
    const data = new FormData(form);
    data.delete("referencias");
    files.forEach((f) => data.append("referencias", f));
    const endpoint = form.dataset.endpoint;

    try {
      if (!endpoint) {
        // DEMO: nenhum serviço ligado. Ver booking-ux.md para ligar Formspree/Netlify Forms/etc.
        await new Promise((r) => setTimeout(r, 600));
        showResult(true, true, data);
      } else {
        const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
        showResult(res.ok, false, data);
      }
    } catch {
      showResult(false, false, data);
    } finally {
      btn.disabled = false; btn.textContent = "Enviar pedido";
    }
  });

  function showResult(ok, demo, data) {
    result.innerHTML = "";
    const h = document.createElement("h3");
    const p = document.createElement("p");
    if (ok && demo) {
      const flag = document.createElement("span"); flag.className = "demo-flag"; flag.textContent = "Modo demonstração";
      h.textContent = "Pedido validado";
      p.textContent = `Num site real, este pedido seria enviado ao estúdio e ${data.get("nome").split(" ")[0]} receberia resposta em 2 dias úteis em ${data.get("email")}. Esta demo não está ligada a nenhum serviço de email, por isso nada foi enviado.`;
      result.append(flag, h, p);
    } else if (ok) {
      h.textContent = "Pedido enviado";
      p.textContent = `Obrigado. Respondemos em 2 dias úteis para ${data.get("email")}.`;
      result.append(h, p);
    } else {
      h.textContent = "O pedido não foi enviado";
      p.textContent = "Verifica a ligação à internet e tenta de novo, ou liga para 0117 496 0418.";
      result.append(h, p);
      result.hidden = false; result.focus();
      return;
    }
    form.hidden = true; result.hidden = false; result.focus();
  }

  /* ---------- CTA fixo no mobile: esconder quando o formulário está visível ---------- */
  const cta = $("#mobile-cta");
  if ("IntersectionObserver" in window) {
    const seen = new Map();
    const update = () => cta.classList.toggle("is-hidden", [...seen.values()].some(Boolean));
    const io = new IntersectionObserver((entries) => { entries.forEach((e) => seen.set(e.target, e.isIntersecting)); update(); }, { threshold: 0 });
    io.observe($(".hero__actions"));
    io.observe($("#marcar"));
  }

  $("#ano").textContent = new Date().getFullYear();
})();
