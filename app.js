async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load ' + path);
  return response.json();
}

function normalizeAssetPath(value) {
  if (!value) return value;
  const raw = String(value);
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  return raw.replace(/^\/assets\//, 'assets/');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date).toUpperCase();
}

function linkList(items = []) {
  return items.filter(item => item?.url).map(item =>
    '<a class="inline-link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer">' +
    escapeHtml(item.label || 'Open') + ' ↗</a>'
  ).join('');
}

function creditList(items = []) {
  return items.filter(item => item?.person).map(item =>
    '<span>' + escapeHtml(item.role || 'Credit') + ' · ' + escapeHtml(item.person) + '</span>'
  ).join('');
}

async function initSite() {
  const [site, releases, live, works, gallery] = await Promise.all([
    loadJson('data/site.json'),
    loadJson('data/releases.json'),
    loadJson('data/live.json'),
    loadJson('data/works.json'),
    loadJson('data/gallery.json')
  ]);

  // Prefer the official distributed cover art from Apple Music/iTunes.
  // Local artist photography remains as a resilient fallback if the catalog API is unavailable.
  await Promise.all(releases.map(async release => {
    if (release.cover) return;
    if (!release.appleMusicAlbumId) { release.cover = release.coverFallback || ''; return; }
    try {
      const response = await fetch('https://itunes.apple.com/lookup?id=' + encodeURIComponent(release.appleMusicAlbumId));
      if (!response.ok) throw new Error('Artwork lookup failed');
      const payload = await response.json();
      const artwork = payload.results && payload.results[0] && payload.results[0].artworkUrl100;
      release.cover = artwork
        ? artwork.replace(/\d+x\d+bb\./, '1200x1200bb.')
        : (release.coverFallback || '');
    } catch (_) {
      release.cover = release.coverFallback || '';
    }
  }));

  if (location.pathname.endsWith('/') || location.pathname.endsWith('/index.html')) document.title = site.artistName + ' — Official Artist Website';
  const latest = releases
    .filter(r => r.status !== 'Archive')
    .slice()
    .sort((a, b) => String(b.releaseDate || b.year || '').localeCompare(String(a.releaseDate || a.year || '')))[0];

  const latestTitle = document.querySelector('.latest-title');
  const latestSubtitle = document.querySelector('.latest-subtitle');
  const latestType = document.querySelector('.spotlight-copy .track-type');
  const latestLink = document.querySelector('.latest-link');
  const spotlightArt = document.querySelector('.spotlight-art');
  if (latest) {
    if (latestTitle) latestTitle.textContent = latest.title || site.artistName;
    if (latestSubtitle) latestSubtitle.textContent = [latest.englishTitle, latest.artist && latest.artist !== 'Tang Miu' ? latest.artist : ''].filter(Boolean).join(' · ');
    if (latestType) latestType.textContent = ((latest.type || 'RELEASE') + ' · ' + (latest.year || '')).toUpperCase();
    if (latestLink) {
      latestLink.href = latest.appleMusic || latest.youtube || '#music';
      latestLink.textContent = latest.appleMusic || latest.youtube ? 'Listen to release ↗' : 'Explore the catalog ↗';
      if (latest.appleMusic || latest.youtube) {
        latestLink.target = '_blank';
        latestLink.rel = 'noopener noreferrer';
      }
    }
    if (spotlightArt && normalizeAssetPath(latest.cover || latest.coverFallback)) {
      spotlightArt.style.backgroundImage = 'url("' + String(normalizeAssetPath(latest.cover || latest.coverFallback)).replaceAll('"','%22') + '")';
      spotlightArt.style.backgroundSize = 'cover';
      spotlightArt.style.backgroundPosition = 'center';
      spotlightArt.textContent = '';
      spotlightArt.setAttribute('aria-label', 'Artwork for ' + (latest.title || site.artistName));
    }
  }

  const setStat = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  };
  setStat('.stat-releases', releases.filter(r => r.status !== 'Archive').length);
  setStat('.stat-live', live.length);
  setStat('.stat-works', works.length);

  const header = document.querySelector('.site-header');
  const nav = header?.querySelector('nav');
  if (header && nav && !header.querySelector('.menu-toggle')) {
    const toggle = document.createElement('button');
    toggle.className = 'menu-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    toggle.textContent = 'Menu';
    header.insertBefore(toggle, header.querySelector('.header-link'));
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('mobile-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      toggle.textContent = open ? 'Close' : 'Menu';
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      header.classList.remove('mobile-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
      toggle.textContent = 'Menu';
    }));
  }

  const revealTargets = document.querySelectorAll('.section, .release-spotlight, .artist-strip, .gallery, .site-footer');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealTargets.forEach(el => el.classList.add('reveal'));
    revealTargets.forEach(el => observer.observe(el));
  }

  const navLinks = document.querySelectorAll('.site-header nav a[href^="#"]');
  const sections = Array.from(navLinks).map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => link.removeAttribute('aria-current'));
          const active = document.querySelector('.site-header nav a[href="#' + entry.target.id + '"]');
          if (active) active.setAttribute('aria-current', 'page');
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    sections.forEach(section => sectionObserver.observe(section));
  }


  const heroImage = document.querySelector('.hero-image img');
  if (heroImage && normalizeAssetPath(site.heroImage)) {
    heroImage.src = normalizeAssetPath(site.heroImage);
    heroImage.alt = site.artistName + ' performing live on stage';
  }

  const heroLede = document.querySelector('.hero-lede');
  if (heroLede) heroLede.textContent = site.shortBio || '';

  const heroMeta = document.querySelector('.hero-meta');
  if (heroMeta) {
    heroMeta.innerHTML =
      '<span>' + escapeHtml(site.location || '') + '</span>' +
      '<span>' + escapeHtml((site.genre || '').toUpperCase()) + '</span>' +
      '<span>EST. ' + escapeHtml(site.activeSince || '') + '</span>';
  }

  const statementText = document.querySelector('.statement-grid > p');
  if (statementText) statementText.textContent = site.bio || '';

  const albumGrid = document.querySelector('.album-grid');
  if (albumGrid) {
    const searchInput = document.querySelector('#release-search');
    const sortSelect = document.querySelector('#release-sort');
    const resultLabel = document.querySelector('#release-results');
    const savedReleaseIds = new Set();
    const releaseId = release => String(release.appleMusicAlbumId || release.title || 'release');
    const filterButtons = Array.from(document.querySelectorAll('[data-release-filter]'));
    let activeFilter = 'all';
    const publishedReleases = releases.filter(release => release.status !== 'Archive');
    const releaseDateValue = release => String(release.releaseDate || release.year || '');
    const isCollaboration = release => Boolean(release.artist && release.artist !== 'Tang Miu' && /[×&+]/.test(release.artist));
    const renderReleases = () => {
      const query = (searchInput?.value || '').trim().toLocaleLowerCase();
      const sort = sortSelect?.value || 'newest';
      let visible = publishedReleases.filter(release => {
        const collab = isCollaboration(release);
        if (activeFilter === 'solo' && collab) return false;
        if (activeFilter === 'collab' && !collab) return false;
        if (activeFilter === 'saved' && !savedReleaseIds.has(releaseId(release))) return false;
        const haystack = [release.title, release.englishTitle, release.description, release.artist, release.year,
          ...(release.credits || []).flatMap(credit => [credit.person, credit.role])]
          .filter(Boolean).join(' ').toLocaleLowerCase();
        return !query || haystack.includes(query);
      });
      visible.sort((a, b) => {
        if (sort === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'th');
        const comparison = releaseDateValue(b).localeCompare(releaseDateValue(a));
        return sort === 'oldest' ? -comparison : comparison;
      });
      albumGrid.innerHTML = visible.map((release, index) => {
        const year = release.year || (release.releaseDate || '').slice(0, 4);
        const links = [
          release.youtube && {label: 'Watch / listen', url: release.youtube},
          release.appleMusic && {label: 'Apple Music', url: release.appleMusic},
          release.spotify && {label: 'Spotify', url: release.spotify}
        ].filter(Boolean);
        const art = normalizeAssetPath(release.cover || release.coverFallback || '');
        const shareUrl = release.appleMusic || release.youtube || location.href.split('#')[0] + '#music';
        const artistLabel = release.artist || 'Tang Miu';
        return '<article class="track' + (index === 0 && !query && activeFilter === 'all' ? ' featured' : '') + '">' +
          '<div class="track-art">' + (art ? '<img src="' + escapeHtml(art) + '" alt="Cover artwork for ' + escapeHtml(release.title) + '" loading="lazy" onerror="this.onerror=null;this.src=\'assets/buca-stage.jpg\'">' : '') +
          '<span class="track-art-number">' + String(index + 1).padStart(2, '0') + ' / ' + escapeHtml(year) + '</span></div>' +
          '<div>' +
          '<p class="track-type">' + escapeHtml((release.type || 'RELEASE').toUpperCase()) + ' · ' + escapeHtml(year) + '</p>' +
          '<h3>' + escapeHtml(release.title) + '</h3>' +
          '<p class="roman">' + escapeHtml([release.englishTitle, artistLabel !== 'Tang Miu' ? artistLabel : ''].filter(Boolean).join(' · ')) + '</p>' +
          '<p>' + escapeHtml(release.description || '') + '</p>' +
          '<div class="credits">' + creditList(release.credits) + '</div>' +
          '<div class="track-links">' + links.map(item =>
            '<a class="inline-link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.label) + ' ↗</a>'
          ).join('') +
          '<button class="inline-link share-release" type="button" data-share-url="' + escapeHtml(shareUrl) + '" data-share-title="' + escapeHtml(release.title + ' — Tang Miu') + '">Share ↗</button>' +
          '<button class="inline-link save-release" type="button" data-release-id="' + escapeHtml(releaseId(release)) + '" aria-pressed="' + String(savedReleaseIds.has(releaseId(release))) + '">' + (savedReleaseIds.has(releaseId(release)) ? '♥ Saved' : '♡ Save') + '</button></div>' +
          '</div></article>';
      }).join('');
      if (!visible.length) {
        albumGrid.innerHTML = '<div class="music-empty"><span>NO MATCHES</span><h3>Nothing found just yet.</h3><p>Try another title, lyric idea, credit or filter.</p><button type="button" class="clear-music-filters">Clear search</button></div>';
      }
      if (resultLabel) resultLabel.textContent = 'Showing ' + visible.length + ' of ' + publishedReleases.length + ' releases';
      albumGrid.querySelectorAll('.clear-music-filters').forEach(button => button.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        activeFilter = 'all';
        filterButtons.forEach(item => {
          const active = item.dataset.releaseFilter === 'all';
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        if (sortSelect) sortSelect.value = 'newest';
        renderReleases();
        searchInput?.focus();
      }));
      albumGrid.querySelectorAll('.save-release').forEach(button => button.addEventListener('click', () => {
        const id = button.dataset.releaseId;
        if (savedReleaseIds.has(id)) savedReleaseIds.delete(id);
        else savedReleaseIds.add(id);
        renderReleases();
      }));
      albumGrid.querySelectorAll('.share-release').forEach(button => button.addEventListener('click', async () => {
        const shareData = { title: button.dataset.shareTitle || 'Tang Miu', text: 'Listen to Tang Miu', url: button.dataset.shareUrl || location.href };
        const original = button.textContent;
        try {
          if (navigator.share) {
            await navigator.share(shareData);
          } else if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(shareData.url);
            button.textContent = 'Link copied ✓';
            window.setTimeout(() => { button.textContent = original; }, 1800);
          } else {
            const field = document.createElement('textarea');
            field.value = shareData.url;
            field.setAttribute('readonly', '');
            field.style.position = 'absolute';
            field.style.left = '-9999px';
            document.body.appendChild(field);
            field.select();
            const copied = document.execCommand('copy');
            field.remove();
            button.textContent = copied ? 'Link copied ✓' : 'Copy unavailable';
            window.setTimeout(() => { button.textContent = original; }, 1800);
          }
        } catch (error) {
          if (error && error.name !== 'AbortError') console.warn('Could not share this release.', error);
        }
      }));
    };
    filterButtons.forEach(button => button.addEventListener('click', () => {
      activeFilter = button.dataset.releaseFilter || 'all';
      filterButtons.forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      renderReleases();
    }));
    searchInput?.addEventListener('input', renderReleases);
    sortSelect?.addEventListener('change', renderReleases);
    document.querySelector('#surprise-release')?.addEventListener('click', () => {
      const cards = Array.from(albumGrid.querySelectorAll('.track'));
      if (!cards.length) return;
      const chosen = cards[Math.floor(Math.random() * cards.length)];
      chosen.classList.add('is-surprise');
      chosen.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => chosen.classList.remove('is-surprise'), 1800);
    });
    renderReleases();
  }
  const sectionNote = document.querySelector('#music .section-note');
  if (sectionNote) {
    sectionNote.textContent = releases.length + ' official release' + (releases.length === 1 ? '' : 's') + ' currently form the catalog.';
  }

  const liveList = document.querySelector('.live-list');
  if (liveList) {
    liveList.innerHTML = live.slice().sort((a,b) => String(b.date).localeCompare(String(a.date))).map(item =>
      '<article class="live-item">' +
      (item.image ? '<div class="live-item-image"><img src="' + escapeHtml(normalizeAssetPath(item.image)) + '" alt="' + escapeHtml(item.title || 'Tang Miu live performance') + '" loading="lazy"></div>' : '') +
      '<div class="live-item-copy"><p class="date">' + escapeHtml(formatDate(item.date)) + '</p>' +
      '<h3>' + escapeHtml(item.title || '') + '</h3>' +
      '<p>' + escapeHtml(item.venue || '') + '</p>' +
      (item.description ? '<p>' + escapeHtml(item.description) + '</p>' : '') +
      '<div class="live-links">' + linkList(item.links) + '</div></div></article>'
    ).join('');
  }

  const liveNote = document.querySelector('#live .section-note');
  if (liveNote) liveNote.textContent = live.length + ' selected performance' + (live.length === 1 ? '' : 's') + '.';

  const cover = works.find(work => work.type === 'Cover') || works[0];
  const coverCard = document.querySelector('.cover-card');
  if (coverCard && cover) {
    coverCard.innerHTML =
      '<img src="' + escapeHtml(normalizeAssetPath(cover.cover) || 'assets/live-red-02.jpg') + '" alt="' + escapeHtml(cover.title || 'Tang Miu cover work') + '">' +
      '<div><p class="track-type">' + escapeHtml((cover.type || 'WORK').toUpperCase()) + ' · ' + escapeHtml(cover.year || '') + '</p>' +
      '<h3>' + escapeHtml(cover.title || '') + '</h3>' +
      '<p class="roman">' + escapeHtml(cover.artist || '') + '</p>' +
      '<p>' + escapeHtml(cover.description || '') + '</p>' +
      '<div class="credits">' + creditList(cover.credits) + '</div>' +
      '<div class="track-links">' + linkList(cover.links) + '</div></div>';
  }

  const galleryEl = document.querySelector('.gallery');
  if (galleryEl) {
    galleryEl.innerHTML = gallery.slice(0, 4).map(item =>
      '<img src="' + escapeHtml(normalizeAssetPath(item.image)) + '" alt="' + escapeHtml(item.alt || item.title || '') + '" loading="lazy">'
    ).join('');
  }

  const worksGrid = document.querySelector('.works-grid');
  if (worksGrid) {
    worksGrid.innerHTML = works.map(work =>
      '<article class="work-card">' +
      '<div class="work-image">' + (normalizeAssetPath(work.cover) ? '<img src="' + escapeHtml(normalizeAssetPath(work.cover)) + '" alt="' + escapeHtml(work.title || '') + '" loading="lazy">' : '') + '</div>' +
      '<div class="work-body">' +
      '<p class="track-type">' + escapeHtml((work.type || 'WORK').toUpperCase()) + ' · ' + escapeHtml(work.year || '') + '</p>' +
      '<h3>' + escapeHtml(work.title || '') + '</h3>' +
      '<p class="roman">' + escapeHtml(work.artist || '') + '</p>' +
      (work.description ? '<p>' + escapeHtml(work.description) + '</p>' : '') +
      '<div class="credits">' + creditList(work.credits) + '</div>' +
      '<div class="track-links">' + linkList(work.links) + '</div>' +
      '</div></article>'
    ).join('');
  }

  const profileTracks = document.querySelector('.profile-tracks');
  if (profileTracks) {
    profileTracks.innerHTML = releases.filter(r => r.status !== 'Archive').map((release, index) =>
      '<div><span>' + String(index + 1).padStart(2, '0') + '</span>' +
      '<strong>' + escapeHtml(release.title || '') + '</strong>' +
      '<em>' + escapeHtml([release.englishTitle, release.year ? String(release.year) : '', release.artist && release.artist !== 'Tang Miu' ? release.artist : ''].filter(Boolean).join(' · ')) + '</em></div>'
    ).join('');
  }

  const aboutLead = document.querySelector('.about-copy .lead');
  if (aboutLead) aboutLead.textContent = site.shortBio || '';

  const aboutDetails = document.querySelector('.artist-details');
  if (aboutDetails) {
    aboutDetails.innerHTML =
      '<span>Artist name</span><strong>' + escapeHtml(site.artistName) + '</strong>' +
      '<span>Based in</span><strong>' + escapeHtml(site.location) + '</strong>' +
      '<span>Primary style</span><strong>' + escapeHtml(site.genre) + '</strong>' +
      '<span>Active since</span><strong>' + escapeHtml(site.activeSince) + '</strong>';
  }

  const emailLinks = document.querySelectorAll('.email-link');
  emailLinks.forEach(link => {
    link.href = 'mailto:' + site.contactEmail;
    link.innerHTML = escapeHtml(site.contactEmail) + ' <span>↗</span>';
  });

  const socialMap = {
    Spotify: site.spotify,
    'Apple Music': site.appleMusic,
    YouTube: site.youtube,
    Instagram: site.instagram,
    TikTok: site.tiktok,
    X: site.x
  };
  document.querySelectorAll('.social-grid a').forEach(link => {
    const label = link.querySelector('span')?.textContent;
    if (label && socialMap[label]) link.href = socialMap[label];
  });
}

initSite().catch(error => {
  console.warn('Tang Miu CMS content could not be loaded; keeping fallback page.', error);
});


// Progressive motion enhancements. The core site remains usable without these effects.
(function initMotionDesign() {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  const heroImage = document.querySelector('.hero-image');
  const finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let scrollTicking = false;

  function updateScrollState() {
    const doc = document.documentElement;
    const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
    doc.style.setProperty('--scroll-progress', String(Math.min(1, Math.max(0, window.scrollY / maxScroll))));
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 18);
    scrollTicking = false;
  }
  function onScroll() {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(updateScrollState);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateScrollState();

  const motionSelector = [
    '.hero-image', '.release-spotlight > *', '.statement-grid > *',
    '.artist-strip > *', '.section-head > *', '.track', '.live-item',
    '.cover-card > *', '.gallery img', '.about-grid > *', '.press-inner > *',
    '.contact-section > *', '.social-grid a', '.work-card', '.site-footer > *'
  ].join(',');

  if ('IntersectionObserver' in window) {
    const observed = new WeakSet();
    let motionObserver;
    const collectMotionItems = (root) => {
      if (!root || root.nodeType !== 1) return;
      const candidates = [];
      if (root.matches && root.matches(motionSelector)) candidates.push(root);
      if (root.querySelectorAll) candidates.push(...root.querySelectorAll(motionSelector));
      candidates.forEach((el, index) => {
        if (observed.has(el)) return;
        observed.add(el);
        el.classList.add('motion-item');
        el.style.setProperty('--motion-delay', Math.min(index % 5, 4) * 65 + 'ms');
        motionObserver.observe(el);
      });
    };
    motionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in-view');
        motionObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });

    collectMotionItems(document.body);
    document.body.classList.add('motion-ready');
    // CMS content is rendered asynchronously, so pick up generated cards too.
    const contentObserver = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => collectMotionItems(node)));
    });
    contentObserver.observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
  }

  if (finePointer && hero && heroImage) {
    let pointerFrame = 0;
    hero.addEventListener('pointermove', event => {
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        heroImage.style.setProperty('--hero-shift-x', (x * -7).toFixed(2) + 'px');
        heroImage.style.setProperty('--hero-shift-y', (y * -7).toFixed(2) + 'px');
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      heroImage.style.setProperty('--hero-shift-x', '0px');
      heroImage.style.setProperty('--hero-shift-y', '0px');
    }, { passive: true });
  }
})();
