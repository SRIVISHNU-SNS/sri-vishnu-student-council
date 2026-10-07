const manifestoSections = document.querySelector('#manifesto-sections');
const manifestoPhotos = document.querySelector('#manifesto-photos');
const manifestoDownload = document.querySelector('#download-manifesto');

function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function escapeAttribute(value) { return escapeHtml(value).replace(/javascript:/gi, ''); }
function imageSource(value) {
  const source = String(value || '').replace('/sri-vishnu-poster.png', '/sri-vishnu-poster.webp').replace('/logo.jpg', '/logo.webp');
  return /^(data:image\/|https?:\/\/|\/)/i.test(source) ? source : '';
}

async function loadManifesto() {
  try {
    const response = await fetch('/api/content/manifesto');
    const { content } = await response.json();
    if (!content) return;
    document.querySelector('#manifesto-kicker').textContent = content.kicker || 'OUR MANIFESTO';
    document.querySelector('#manifesto-title').textContent = content.title || '';
    document.querySelector('#manifesto-intro').textContent = content.intro || '';
    document.querySelector('#manifesto-closing').textContent = content.closing || '';
    manifestoSections.innerHTML = (content.sections || []).map((section, index) => `<article class="manifesto-block"><span class="block-number">${String(index + 1).padStart(2, '0')}</span><div><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body).replace(/\n/g, '<br />')}</p></div></article>`).join('');
    manifestoPhotos.innerHTML = (content.photos || []).map((photo) => `<img src="${escapeAttribute(imageSource(photo))}" alt="Sri Vishnu manifesto visual" loading="lazy" decoding="async" />`).join('');
  } catch (error) {
    manifestoSections.innerHTML = '<p class="form-status">Manifesto content is temporarily unavailable.</p>';
  }
}

manifestoDownload?.addEventListener('click', () => window.print());
loadManifesto();
