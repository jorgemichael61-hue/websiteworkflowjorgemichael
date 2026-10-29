/* FLO Skincare tropical concept — interactions and scroll choreography */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = window.gsap;
  const hasST = !!(G && window.ScrollTrigger);
  if (reduce) document.documentElement.classList.add('reduce');
  if (hasST) G.registerPlugin(ScrollTrigger);
  if (G && /[?&]snap/.test(location.search)) G.ticker.lagSmoothing(0);   // test mode

  const products = window.FLO_PRODUCTS || [];
  const byId = Object.fromEntries(products.map(p => [p.id, p]));

  /* ---------- toast ---------- */
  const toastEl = $('#toast'); let toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 3200); }

  /* ---------- product rail ---------- */
  const rail = $('#rail');
  rail.innerHTML = products.map(p => `
    <article class="card" data-cat="${p.cat}">
      <button class="card__media" data-open="${p.id}" aria-label="View ${p.name}">
        ${p.soldOut ? '<span class="card__badge">Sold out on the live shop</span>' : ''}
        <img src="${p.img}" alt="${p.alt}" loading="lazy"><img src="${p.img2}" alt="" loading="lazy">
      </button>
      <div class="card__info">
        <div><h3 class="card__name">${p.name}</h3><p class="card__line">${p.line}</p></div>
        <span class="card__price">${p.priceLabel}</span>
      </div>
      <div class="card__actions">
        <button class="btn btn--dark" data-add="${p.id}" ${p.soldOut || p.price == null ? 'disabled' : ''}>${p.soldOut ? 'Sold out' : p.price == null ? 'Price on live shop' : 'Add to bag'}</button>
        <button class="btn btn--line" data-open="${p.id}">Details</button>
      </div>
    </article>`).join('');

  const chips = $$('.chip');
  function setFilter(f) {
    chips.forEach(c => { const on = c.dataset.filter === f; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on); });
    $$('.card', rail).forEach(card => card.classList.toggle('is-hidden', f !== 'all' && card.dataset.cat !== f));
    if (hasST) { ScrollTrigger.refresh(); if (!reduce) G.fromTo($$('.card:not(.is-hidden)', rail), { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: .06, duration: .6, ease: 'power3.out' }); }
  }
  chips.forEach(c => c.addEventListener('click', () => setFilter(c.dataset.filter)));
  $$('.col').forEach(c => c.addEventListener('click', () => {
    setFilter(c.dataset.filter);
    scrollTo({ top: $('#shop').getBoundingClientRect().top + scrollY, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- product dialog ---------- */
  const pd = $('#pd'); let current = null;
  function openProduct(id) {
    const p = byId[id]; if (!p) return; current = p;
    $('#pdImg').src = p.img; $('#pdImg').alt = p.alt; $('#pdImg2').src = p.img2;
    $('#pdCat').textContent = p.catLabel; $('#pdName').textContent = p.name; $('#pdClaim').textContent = p.claim;
    $('#pdIng').textContent = p.ing; $('#pdUse').textContent = p.use; $('#pdPrice').textContent = p.priceLabel;
    const add = $('#pdAdd'); add.disabled = !!p.soldOut || p.price == null;
    add.textContent = p.soldOut ? 'Sold out' : p.price == null ? 'Price on live shop' : 'Add to bag';
    $('#pdNote').textContent = p.soldOut ? 'Currently sold out on floskincare.co.uk.' : 'Ingredients transcribed from the product label.';
    pd.showModal();
  }
  $('#pdAdd').addEventListener('click', () => { if (current) addToBag(current.id); pd.close(); });

  /* ---------- bag (demo) ---------- */
  const bag = new Map(), bagDlg = $('#bag');
  function renderBag() {
    let count = 0, total = 0; const list = $('#bagList'); list.innerHTML = '';
    bag.forEach((qty, id) => {
      const p = byId[id]; count += qty; total += qty * p.price;
      const li = document.createElement('li');
      li.innerHTML = `<img src="${p.img}" alt=""><div><strong>${p.name}</strong><small>Qty ${qty}, £${(p.price * qty).toFixed(2)}</small></div><button data-remove="${id}">Remove</button>`;
      list.appendChild(li);
    });
    $('#bagEmpty').hidden = count > 0; $('#bagTotal').textContent = '£' + total.toFixed(2); $('#checkoutBtn').disabled = count === 0;
    const c = $('#bagCount'); c.textContent = count; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); setTimeout(() => c.classList.remove('bump'), 400);
  }
  function addToBag(id) { const p = byId[id]; if (!p || p.soldOut || p.price == null) return; bag.set(id, (bag.get(id) || 0) + 1); renderBag(); toast(`${p.name} added to your bag`); }
  $('#bagList').addEventListener('click', e => { const id = e.target.dataset.remove; if (id) { bag.delete(id); renderBag(); } });
  $('#bagBtn').addEventListener('click', () => bagDlg.showModal());
  $('#checkoutBtn').addEventListener('click', () => toast('Checkout is switched off in this prototype'));
  renderBag();
  document.addEventListener('click', e => {
    const open = e.target.closest('[data-open]'); if (open) { e.preventDefault(); openProduct(open.dataset.open); return; }
    const add = e.target.closest('[data-add]'); if (add) { addToBag(add.dataset.add); return; }
    const close = e.target.closest('[data-close]'); if (close) close.closest('dialog').close();
  });
  [pd, bagDlg].forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  /* ---------- menu ---------- */
  const menuBtn = $('#menuBtn'), menu = $('#menu');
  function setMenu(open) {
    menu.hidden = !open; menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open && G && !reduce) G.from($$('.menu nav a'), { y: 40, opacity: 0, stagger: .05, duration: .7, ease: 'expo.out' });
  }
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  $$('.menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

  /* ---------- nav: active link + dark text over the sand panel ---------- */
  const nav = $('#nav'), panel = $('.panel'), navLinks = $$('.nav__links a');
  function navState() {
    const r = panel.getBoundingClientRect();
    nav.classList.toggle('on-panel', r.top < 60 && r.bottom > 60);
  }
  addEventListener('scroll', navState, { passive: true }); navState();
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -45% 0px' });
  $$('#experience, #ocean, #shop, #story').forEach(s => io.observe(s));

  /* ---------- glass highlight follows the pointer ---------- */
  document.addEventListener('pointermove', e => {
    const g = e.target.closest && e.target.closest('.glass'); if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty('--mx', (e.clientX - r.left) + 'px'); g.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ---------- newsletter (demo) ---------- */
  $('#newsForm').addEventListener('submit', e => {
    e.preventDefault();
    const i = $('#email'), m = $('#newsMsg');
    if (!i.value || !i.checkValidity()) { m.textContent = 'Enter an email address like name@example.com.'; i.focus(); return; }
    m.textContent = 'Subscribed. In the live shop your 10% code would arrive by email. (Demo: nothing was sent.)'; i.value = '';
  });
  $('#toTop').addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- lazy, viewport-aware video ---------- */
  const vio = new IntersectionObserver(es => es.forEach(({ target: v, isIntersecting }) => {
    if (isIntersecting) { if (!v.src) v.src = v.dataset.src; if (!reduce) v.play().catch(() => {}); }
    else if (!v.paused) v.pause();
  }), { rootMargin: '200px 0px' });
  $$('video[data-src]').forEach(v => vio.observe(v));

  /* ---------- split headings into words ---------- */
  $$('[data-split]').forEach(el => { el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w"><span>${w}</span></span>`).join(' '); });

  /* ---------- living wave edges on the sand panel ---------- */
  const waves = $$('.wave path'); let wt = 0;
  function waveTick(dt) {
    wt += dt;
    waves.forEach((p, i) => {
      let d = 'M0 120 L0 70';
      for (let x = 0; x <= 1440; x += 40) d += ` L${x} ${(70 - Math.sin(x / 220 + wt * .9 + i * 2) * 22 - Math.sin(x / 90 - wt * 1.4 + i) * 8 - Math.sin(x / 520 + wt * .4) * 14).toFixed(1)}`;
      p.setAttribute('d', d + ' L1440 120 Z');
    });
  }
  let last = performance.now();
  (function loop(now) { requestAnimationFrame(loop); const dt = Math.min((now - last) / 1000, .05); last = now; if (!reduce || wt === 0) waveTick(reduce ? .01 : dt); })(last);

  /* ---------- intro: FLO, then a wave sweeps up to reveal the beach ---------- */
  const introPath = $('#introPath');
  function curtain(p, amp) {
    const base = 100 * (1 - p);
    let d = 'M0 0 H100 V' + base.toFixed(2);
    for (let x = 100; x >= 0; x -= 4) d += ` L${x} ${(base + Math.sin(x / 9 + p * 9) * amp + Math.sin(x / 23 - p * 5) * amp * .6).toFixed(2)}`;
    introPath.setAttribute('d', d + ' Z');
  }
  let introDone = false;
  function finishIntro() {
    if (introDone) return; introDone = true;
    window.__floIntro = true; dispatchEvent(new Event('flo:intro'));
    document.body.classList.remove('is-loading');
    if (!G || reduce) { $('#intro').remove(); return; }
    const o = { p: 0 };
    G.timeline({ onComplete: () => $('#intro').remove() })
      .to('#introBar', { width: '100%', duration: .3 })
      .to('.intro__mark span', { yPercent: -110, duration: .8, stagger: .05, ease: 'power3.in' }, '<.1')
      .to('.intro__sub', { opacity: 0, duration: .3 }, '<')
      .to(o, { p: 1, duration: 1.7, ease: 'expo.inOut', onUpdate: () => curtain(o.p, 7 * Math.sin(o.p * Math.PI)) }, '-=.35')
      .from('.hero__title .line>span', { yPercent: 115, duration: 1.4, stagger: .12, ease: 'expo.out' }, '-=.9')
      .from(['.hero__lede', '.hero__cta', '.hero__caption', '.nav'], { opacity: 0, y: 18, duration: 1.1, stagger: .08, ease: 'power3.out' }, '-=1.1');
  }
  curtain(0, 0);
  if (!G || reduce) finishIntro();
  else {
    G.to('.intro__mark span', { yPercent: 0, y: 0, duration: 1.1, stagger: .08, ease: 'expo.out', delay: .2 });
    G.to('#introBar', { width: '70%', duration: 2.2, ease: 'power1.inOut' });
    let ready = !!window.__ready, min = false;
    const go = () => ready && min && finishIntro();
    addEventListener('flo:ready', () => { ready = true; go(); });
    addEventListener('flo:nowebgl', () => { ready = true; go(); });
    setTimeout(() => { min = true; go(); }, 1800);
    setTimeout(finishIntro, 5000);
  }

  /* ---------- atmosphere lines ---------- */
  const lines = $$('.atmo-line');
  function setLine(i) { lines.forEach((l, k) => l.classList.toggle('is-on', k === i)); }

  if (!hasST || reduce) { setLine(-1); return; }

  /* ---------- scroll choreography ---------- */
  ScrollTrigger.addEventListener('refresh', () => dispatchEvent(new Event('flo:measure')));

  $$('[data-split]').forEach(el => G.from($$('.w>span', el), { yPercent: 115, rotate: 3, duration: 1.4, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 86%' } }));

  G.to('.hero__copy, .hero__caption', { y: -90, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 25%', scrub: true } });

  $$('.reel').forEach(r => G.fromTo(r, { y: 0 }, { y: -Number(r.dataset.speed), ease: 'none', scrollTrigger: { trigger: '.experience', start: 'top bottom', end: 'bottom top', scrub: true } }));
  G.fromTo('.experience__ghost', { xPercent: 15 }, { xPercent: -35, ease: 'none', scrollTrigger: { trigger: '.experience', start: 'top bottom', end: 'bottom top', scrub: true } });
  G.from('.experience__card', { y: 100, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.experience__comp', start: 'top 75%' } });

  G.fromTo('.ocean__title', { scale: .88 }, { scale: 1.04, ease: 'none', scrollTrigger: { trigger: '.ocean', start: 'top bottom', end: 'bottom top', scrub: true } });
  G.from('.ocean__notes li', { y: 80, opacity: 0, duration: 1.4, stagger: .14, ease: 'expo.out', scrollTrigger: { trigger: '.ocean', start: 'top 25%' } });
  $$('.row').forEach(r => G.to(r, { xPercent: Number(r.dataset.dir) * 18, ease: 'none', scrollTrigger: { trigger: '.ocean', start: 'top bottom', end: 'bottom top', scrub: true } }));
  G.to('.ocean__sticky', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.ocean', start: 'bottom 95%', end: 'bottom 45%', scrub: true } });

  G.from('.col', { y: 90, opacity: 0, duration: 1.3, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.collections__grid', start: 'top 80%' } });

  const mm = G.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const pin = $('.shop__pin');
    const dist = () => Math.max(0, rail.scrollWidth - innerWidth);
    G.to(rail, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1 } });
    G.fromTo('.feature__media img', { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.feature', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  ScrollTrigger.create({
    trigger: '.atmosphere', start: 'top top', end: () => '+=' + innerHeight * 2.4,
    onUpdate: s => { setLine(Math.min(lines.length - 1, Math.floor(s.progress * lines.length * .999))); $('#atmoBar').style.width = (s.progress * 100) + '%'; },
    onLeave: () => { setLine(-1); G.to('.atmosphere__bar', { opacity: 0, duration: .4 }); },
    onEnterBack: () => G.to('.atmosphere__bar', { opacity: 1, duration: .4 })
  });
  G.from('.story__media', { clipPath: 'inset(30% 10% 0% 10% round 999px 999px 28px 28px)', scale: .9, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.story__media', start: 'top 80%' } });
  G.from('.story__copy', { y: 90, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.story__copy', start: 'top 85%' } });
  G.from('.story__reels video', { y: 100, opacity: 0, duration: 1.3, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.story__reels', start: 'top 85%' } });

  G.from(['.final__lede', '.final__form', '.final__ig'], { y: 40, opacity: 0, duration: 1.2, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.final__lede', start: 'top 88%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
