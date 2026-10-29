/* FLO Skincare concept — interactions and scroll choreography */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!window.gsap;
  if (reduce) document.documentElement.classList.add('reduce');
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const products = window.FLO_PRODUCTS || [];
  const byId = Object.fromEntries(products.map(p => [p.id, p]));

  /* ---------------- toast ---------------- */
  const toastEl = $('#toast');
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), 3200);
  }

  /* ---------------- render product rail ---------------- */
  const rail = $('#rail');
  rail.innerHTML = products.map(p => `
    <article class="card" data-cat="${p.cat}">
      <button class="card__media" data-open="${p.id}" aria-label="View ${p.name}">
        ${p.soldOut ? '<span class="card__badge">Sold out on the live shop</span>' : ''}
        <img src="${p.img}" alt="${p.alt}" loading="lazy">
        <img src="${p.img2}" alt="" loading="lazy">
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

  /* ---------------- filters ---------------- */
  const chips = $$('.chip');
  function setFilter(f) {
    chips.forEach(c => {
      const on = c.dataset.filter === f;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on);
    });
    $$('.card', rail).forEach(card => card.classList.toggle('is-hidden', f !== 'all' && card.dataset.cat !== f));
    if (hasGSAP && window.ScrollTrigger) {
      ScrollTrigger.refresh();
      if (hasGSAP) gsap.fromTo($$('.card:not(.is-hidden)', rail), { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: .06, duration: .6, ease: 'power3.out' });
    }
  }
  chips.forEach(c => c.addEventListener('click', () => setFilter(c.dataset.filter)));
  $$('.col').forEach(c => c.addEventListener('click', () => {
    setFilter(c.dataset.filter);
    const shop = $('#shop');
    const top = shop.getBoundingClientRect().top + scrollY;
    scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------------- product dialog ---------------- */
  const pd = $('#pd');
  let current = null;
  function openProduct(id) {
    const p = byId[id]; if (!p) return;
    current = p;
    $('#pdImg').src = p.img; $('#pdImg').alt = p.alt;
    $('#pdImg2').src = p.img2;
    $('#pdCat').textContent = p.catLabel;
    $('#pdName').textContent = p.name;
    $('#pdClaim').textContent = p.claim;
    $('#pdIng').textContent = p.ing;
    $('#pdUse').textContent = p.use;
    $('#pdPrice').textContent = p.priceLabel;
    const add = $('#pdAdd');
    add.disabled = !!p.soldOut || p.price == null;
    add.textContent = p.soldOut ? 'Sold out' : p.price == null ? 'Price on live shop' : 'Add to bag';
    $('#pdNote').textContent = p.soldOut ? 'Currently sold out on floskincare.co.uk.' : 'Ingredients transcribed from the product label.';
    pd.showModal();
  }
  $('#pdAdd').addEventListener('click', () => { if (current) addToBag(current.id); pd.close(); });

  /* ---------------- bag (demo state, in memory) ---------------- */
  const bag = new Map();
  const bagDlg = $('#bag');
  function renderBag() {
    let count = 0, total = 0;
    const list = $('#bagList');
    list.innerHTML = '';
    bag.forEach((qty, id) => {
      const p = byId[id]; count += qty; total += qty * p.price;
      const li = document.createElement('li');
      li.innerHTML = `<img src="${p.img}" alt=""><div><strong>${p.name}</strong><small>Qty ${qty} · £${(p.price * qty).toFixed(2)}</small></div><button data-remove="${id}">Remove</button>`;
      list.appendChild(li);
    });
    $('#bagEmpty').hidden = count > 0;
    $('#bagTotal').textContent = '£' + total.toFixed(2);
    $('#checkoutBtn').disabled = count === 0;
    const c = $('#bagCount');
    c.textContent = count;
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    setTimeout(() => c.classList.remove('bump'), 400);
  }
  function addToBag(id) {
    const p = byId[id]; if (!p || p.soldOut || p.price == null) return;
    bag.set(id, (bag.get(id) || 0) + 1);
    renderBag();
    toast(`${p.name} added to your bag`);
  }
  $('#bagList').addEventListener('click', e => {
    const id = e.target.dataset.remove; if (!id) return;
    bag.delete(id); renderBag();
  });
  $('#bagBtn').addEventListener('click', () => bagDlg.showModal());
  $('#checkoutBtn').addEventListener('click', () => toast('Checkout is switched off in this prototype'));
  renderBag();

  /* delegated: open / add / close / demo links */
  document.addEventListener('click', e => {
    const open = e.target.closest('[data-open]');
    if (open) { e.preventDefault(); openProduct(open.dataset.open); return; }
    const add = e.target.closest('[data-add]');
    if (add) { addToBag(add.dataset.add); return; }
    const close = e.target.closest('[data-close]');
    if (close) { close.closest('dialog').close(); return; }
    const demo = e.target.closest('[data-demo]');
    if (demo) { e.preventDefault(); toast(demo.dataset.demo); }
  });
  // click on backdrop closes dialogs
  [pd, bagDlg].forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  /* ---------------- mobile menu ---------------- */
  const menuBtn = $('#menuBtn'), menu = $('#menu');
  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', open);
    if (open && hasGSAP && !reduce) gsap.from($$('.menu nav a'), { y: 40, opacity: 0, stagger: .05, duration: .6, ease: 'power3.out' });
  }
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  $$('.menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

  /* ---------------- nav state ---------------- */
  const nav = $('#nav'), hero = $('.hero');
  function navState() { nav.classList.toggle('is-solid', scrollY > hero.offsetHeight - 80); }
  addEventListener('scroll', navState, { passive: true }); navState();

  /* ---------------- newsletter (demo) ---------------- */
  $('#newsForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#email'), msg = $('#newsMsg');
    if (!input.value || !input.checkValidity()) {
      msg.textContent = 'Enter an email address like name@example.com.';
      msg.classList.add('is-error'); input.focus(); return;
    }
    msg.classList.remove('is-error');
    msg.textContent = 'Subscribed. In the live shop your 10% code would arrive by email. (Demo: nothing was sent.)';
    input.value = '';
  });

  $('#toTop').addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------------- lazy, viewport-aware video ---------------- */
  const vids = $$('video[data-src]').filter(v => v.id !== 'heroFallback');
  const vio = new IntersectionObserver(entries => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        if (!reduce) v.play().catch(() => {});
      } else if (!v.paused) v.pause();
    });
  }, { rootMargin: '200px 0px' });
  vids.forEach(v => vio.observe(v));

  // hero fallback when WebGL isn't available
  window.addEventListener('flo:nowebgl', () => {
    document.documentElement.classList.add('no-webgl');
    const v = $('#heroFallback'); v.src = v.dataset.src; if (!reduce) v.play().catch(() => {});
  });

  /* ---------------- intro + hero entrance ---------------- */
  const intro = $('#intro');
  let introDone = false;
  function finishIntro() {
    if (introDone) return; introDone = true;
    window.__floIntro = true;
    window.dispatchEvent(new Event('flo:intro'));
    document.body.classList.remove('is-loading');
    if (!hasGSAP || reduce) { intro.remove(); return; }
    const tl = gsap.timeline();
    tl.to('.intro__mark span', { yPercent: -105, duration: .7, stagger: .06, ease: 'power3.in' })
      .to('.intro__sub', { opacity: 0, duration: .3 }, '<')
      .to(intro, { clipPath: 'circle(0% at 70% 55%)', duration: 1.2, ease: 'expo.inOut' }, '-=.25')
      .set(intro, { display: 'none' })
      .from('.hero__title .line>span', { yPercent: 110, duration: 1.3, stagger: .12, ease: 'expo.out' }, '-=.55')
      .from(['.hero__lede', '.hero__cta', '.hero__caption', '.hero__scroll'], { opacity: 0, y: 20, duration: 1, stagger: .1, ease: 'power3.out' }, '-=.9');
  }
  if (!hasGSAP || reduce) {
    finishIntro();
  } else {
    gsap.timeline()
      .to('.intro__mark span', { y: 0, duration: 1, stagger: .09, ease: 'expo.out', delay: .15 })
      .to('.intro__sub', { opacity: .8, duration: .6 }, '-=.5');
    let ready = false, minTime = false;
    const go = () => { if (ready && minTime) finishIntro(); };
    window.addEventListener('flo:ready', () => { ready = true; go(); });
    if (window.__floReady) ready = true;
    setTimeout(() => { minTime = true; go(); }, 1500);
    setTimeout(finishIntro, 4000); // never block on slow networks
  }

  /* ---------------- scroll choreography ---------------- */
  if (!hasGSAP || !window.ScrollTrigger || reduce) return;

  // hero copy drifts and fades as you leave
  gsap.to('.hero__copy', { yPercent: -25, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // film reels parallax
  $$('.reel').forEach(r => {
    gsap.fromTo(r, { y: 0 }, { y: Number(r.dataset.speed) * -1, ease: 'none',
      scrollTrigger: { trigger: '.film__reels', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // section headings: one restrained masked reveal
  $$('.film__intro h2, .sec-head h2, .shop__head h2, .ingredients__copy h2, .story__copy h2, .poolside__title, .journal h2').forEach(h => {
    gsap.from(h, { yPercent: 40, opacity: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: h, start: 'top 88%' } });
  });

  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    // pinned horizontal product rail
    const pin = $('.shop__pin');
    const dist = () => Math.max(0, rail.scrollWidth - innerWidth);
    gsap.to(rail, { x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1 } });

    // feature image parallax
    gsap.fromTo('.feature__media img', { yPercent: -8 }, { yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.feature', start: 'top bottom', end: 'bottom top', scrub: true } });

    // collections cards gentle stagger
    gsap.from('.col', { y: 80, opacity: 0, duration: 1.2, stagger: .12, ease: 'expo.out',
      scrollTrigger: { trigger: '.collections__grid', start: 'top 80%' } });
  });

  // ingredient rows drift in opposite directions
  $$('.row').forEach(r => {
    const dir = Number(r.dataset.dir);
    gsap.to(r, { xPercent: dir * 18, ease: 'none',
      scrollTrigger: { trigger: '.ingredients', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // arch video rises
  gsap.from('.arch', { clipPath: 'inset(30% 0 0 0 round 999px 999px 24px 24px)', scale: .92, duration: 1.4, ease: 'expo.out',
    scrollTrigger: { trigger: '.ingredients__stage', start: 'top 75%' } });

  // story image unmasks with scroll
  gsap.fromTo('.story__media', { clipPath: 'inset(18% 12% 18% 12% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none',
    scrollTrigger: { trigger: '.story', start: 'top 85%', end: 'center center', scrub: true } });
  gsap.fromTo('.story__media img', { scale: 1.25 }, { scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.story', start: 'top 85%', end: 'center center', scrub: true } });

  // poolside grid
  gsap.from('.poolside__grid video', { y: 100, opacity: 0, duration: 1.2, stagger: .1, ease: 'expo.out',
    scrollTrigger: { trigger: '.poolside__grid', start: 'top 85%' } });

  // refresh once images settle
  addEventListener('load', () => ScrollTrigger.refresh());
})();
