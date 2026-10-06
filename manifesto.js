const manifestoSections = document.querySelector('#manifesto-sections');
const manifestoPhotos = document.querySelector('#manifesto-photos');

async function loadManifesto() {
  try {
    const response = await fetch('/api/content/manifesto');
    const { content } = await response.json();
    if (!content) return;
    document.querySelector('#manifesto-title').textContent = content.title || '';
    document.querySelector('#manifesto-intro').textContent = content.intro || '';
    document.querySelector('#manifesto-closing').textContent = content.closing || '';
    manifestoSections.innerHTML = (content.sections || []).map((section) => `<article class="manifesto-block"><span class="block-number">${String((content.sections || []).indexOf(section) + 1).padStart(2, '0')}</span><div><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p></div></article>`).join('');
    manifestoPhotos.innerHTML = (content.photos || []).map((photo) => `<img src="${escapeAttribute(photo)}" alt="Sri Vishnu campaign visual" loading="lazy" />`).join('');
  } catch (error) {
    manifestoSections.innerHTML = '<p class="form-status">Manifesto content is temporarily unavailable.</p>';
  }
}

function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function escapeAttribute(value) { return escapeHtml(value).replace(/javascript:/gi, ''); }
loadManifesto();
