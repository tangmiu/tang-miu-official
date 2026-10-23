/* Lightweight motion system for the editorial artist site. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document.documentElement;
  const body = document.body;
  let ticking = false;
  const header = document.querySelector('.site-header');

  const updateScroll = () => {
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    doc.style.setProperty('--scroll-progress', String(Math.min(1, Math.max(0, window.scrollY / max))));
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScroll);
  }, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });
  updateScroll();

  if (reduce) return;
  body.classList.add('motion-on');

  const selector = '.hero-image, .release-spotlight, .statement-grid > *, .artist-strip > *, .section-head > *, .track, .live-item, .cover-card > *, .gallery img, .about-grid > *, .press-inner > *, .contact-section > *, .social-grid a, .work-card';
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -35px 0px' });

    const seen = new WeakSet();
    const attach = root => {
      if (!root || root.nodeType !== 1) return;
      const found = [];
      if (root.matches && root.matches(selector)) found.push(root);
      if (root.querySelectorAll) found.push(...root.querySelectorAll(selector));
      found.forEach((el, i) => {
        if (seen.has(el)) return;
        seen.add(el);
        el.classList.add('motion-reveal');
        el.dataset.motionDelay = String(i % 4);
        io.observe(el);
      });
    };
    attach(body);
    const mo = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(attach)));
    mo.observe(document.querySelector('main') || body, { childList: true, subtree: true });
  }

  const hero = document.querySelector('.hero');
  const image = document.querySelector('.hero-image img');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Fine-pointer tilt: restrained depth on artwork cards, disabled on touch and reduced-motion setups.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const tiltTargets = document.querySelectorAll('.track, .cover-card, .work-card');
    tiltTargets.forEach(card => {
      let raf = 0;
      card.addEventListener('pointermove', event => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          card.style.transform = 'perspective(1100px) rotateX(' + (-y * 2.2).toFixed(2) + 'deg) rotateY(' + (x * 2.8).toFixed(2) + 'deg) translateY(-3px)';
        });
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        if (raf) cancelAnimationFrame(raf);
        card.style.transform = '';
      }, { passive: true });
    });
  }

    if (hero && image && finePointer) {
    let frame = 0;
    hero.addEventListener('pointermove', event => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width - 0.5;
        const y = (event.clientY - r.top) / r.height - 0.5;
        const dx = (x * -8).toFixed(2) + 'px';
        const dy = (y * -8).toFixed(2) + 'px';
        image.style.transform = 'scale(1.1) translate3d(' + dx + ',' + dy + ',0)';
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { image.style.transform = ''; }, { passive: true });
  }
})();