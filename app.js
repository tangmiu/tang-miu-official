async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load ' + path);
  return response.json();
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

  document.title = site.artistName + ' — Official Artist Website';
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
    if (latestLink) latestLink.href = '#music';
    if (spotlightArt && latest.cover) {
      spotlightArt.style.backgroundImage = 'url("' + String(latest.cover).replaceAll('"','%22') + '")';
      spotlightArt.style.backgroundSize = 'cover';
      spotlightArt.style.backgroundPosition = 'center';
      spotlightArt.textContent = '';
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
  if (heroImage && site.heroImage) {
    heroImage.src = site.heroImage;
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
    albumGrid.innerHTML = releases.filter(r => r.status !== 'Archive').map((release, index) => {
      const year = release.year || (release.releaseDate || '').slice(0, 4);
      const links = [
        release.youtube && {label: 'Watch / listen', url: release.youtube},
        release.appleMusic && {label: 'Apple Music', url: release.appleMusic},
        release.spotify && {label: 'Spotify', url: release.spotify}
      ].filter(Boolean);
      return '<article class="track' + (index === 0 ? ' featured' : '') + '">' +
        '<div class="track-number">' + String(index + 1).padStart(2, '0') + '</div>' +
        '<div>' +
        '<p class="track-type">' + escapeHtml((release.type || 'RELEASE').toUpperCase()) + ' · ' + escapeHtml(year) + '</p>' +
        '<h3>' + escapeHtml(release.title) + '</h3>' +
        '<p class="roman">' + escapeHtml(release.englishTitle || '') + '</p>' +
        '<p>' + escapeHtml(release.description || '') + '</p>' +
        '<div class="credits">' + creditList(release.credits) + '</div>' +
        '<div class="track-links">' + links.map(item =>
          '<a class="inline-link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.label) + ' ↗</a>'
        ).join('') + '</div>' +
        '</div></article>';
    }).join('');
  }

  const sectionNote = document.querySelector('#music .section-note');
  if (sectionNote) {
    sectionNote.textContent = releases.length + ' official release' + (releases.length === 1 ? '' : 's') + ' currently form the catalog.';
  }

  const liveList = document.querySelector('.live-list');
  if (liveList) {
    liveList.innerHTML = live.slice().sort((a,b) => String(b.date).localeCompare(String(a.date))).map(item =>
      '<article class="live-item">' +
      '<div><p class="date">' + escapeHtml(formatDate(item.date)) + '</p>' +
      '<h3>' + escapeHtml(item.title || '') + '</h3>' +
      '<p>' + escapeHtml(item.venue || '') + '</p>' +
      (item.description ? '<p>' + escapeHtml(item.description) + '</p>' : '') +
      '</div><div class="live-links">' + linkList(item.links) + '</div></article>'
    ).join('');
  }

  const liveNote = document.querySelector('#live .section-note');
  if (liveNote) liveNote.textContent = live.length + ' selected performance' + (live.length === 1 ? '' : 's') + '.';

  const cover = works.find(work => work.type === 'Cover') || works[0];
  const coverCard = document.querySelector('.cover-card');
  if (coverCard && cover) {
    coverCard.innerHTML =
      '<img src="' + escapeHtml(cover.cover || 'assets/live-red-02.jpg') + '" alt="' + escapeHtml(cover.title || 'Tang Miu cover work') + '">' +
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
      '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.alt || item.title || '') + '" loading="lazy">'
    ).join('');
  }

  const worksGrid = document.querySelector('.works-grid');
  if (worksGrid) {
    worksGrid.innerHTML = works.map(work =>
      '<article class="work-card">' +
      '<div class="work-image">' + (work.cover ? '<img src="' + escapeHtml(work.cover) + '" alt="' + escapeHtml(work.title || '') + '" loading="lazy">' : '') + '</div>' +
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
