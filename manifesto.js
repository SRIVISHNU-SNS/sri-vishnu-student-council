const manifestoSections = document.querySelector('#manifesto-sections');
const manifestoPhotos = document.querySelector('#manifesto-photos');
const manifestoDownload = document.querySelector('#download-manifesto');
const feedbackSection = document.querySelector('#manifesto-feedback');
const feedbackForm = document.querySelector('#feedback-form');
const feedbackList = document.querySelector('#feedback-list');
const feedbackStatus = document.querySelector('#feedback-status');
let feedbackLoaded = false;

function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function escapeAttribute(value) { return escapeHtml(value).replace(/javascript:/gi, ''); }
function imageSource(value) {
  const source = String(value || '').replace('/sri-vishnu-poster.png', '/sri-vishnu-poster.webp').replace('/logo.jpg', '/logo.webp');
  return /^(data:image\/|https?:\/\/|\/)/i.test(source) ? source : '';
}
function showFeedbackStatus(message, error = false) { feedbackStatus.textContent = message; feedbackStatus.classList.toggle('is-error', error); }

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

async function loadFeedback() {
  if (feedbackLoaded) return;
  feedbackLoaded = true;
  try {
    const response = await fetch('/api/feedback/manifesto');
    const { comments } = await response.json();
    if (!comments.length) { feedbackList.innerHTML = '<p class="empty-state">No feedback yet. Be the first to share your thoughts.</p>'; return; }
    feedbackList.innerHTML = comments.map((comment) => `<article class="feedback-card"><div><strong>${escapeHtml(comment.name || 'Anonymous')}</strong><time>${escapeHtml(new Date(comment.createdAt).toLocaleDateString())}</time></div><p>${escapeHtml(comment.message).replace(/\n/g, '<br />')}</p></article>`).join('');
  } catch (error) {
    feedbackLoaded = false;
    feedbackList.innerHTML = '<p class="form-status is-error">Feedback is temporarily unavailable.</p>';
  }
}

feedbackForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(feedbackForm);
  const message = String(formData.get('message') || '').trim();
  if (!message) return showFeedbackStatus('Please write a comment before submitting.', true);
  showFeedbackStatus('Posting your feedback…');
  try {
    const response = await fetch('/api/feedback/manifesto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: formData.get('name'), message }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not post feedback.');
    feedbackForm.reset();
    feedbackLoaded = false;
    await loadFeedback();
    showFeedbackStatus('Thank you. Your feedback is now visible.');
  } catch (error) { showFeedbackStatus(error.message, true); }
});

manifestoDownload?.addEventListener('click', async () => {
  manifestoDownload.disabled = true;
  manifestoDownload.textContent = 'PREPARING PDF…';
  fetch('/api/analytics/manifesto-download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  try {
    await downloadElementAsPdf(document.querySelector('#manifesto-document'), 'student-council-manifesto.pdf', { onProgress: (message) => { manifestoDownload.textContent = message === 'PDF downloaded.' ? 'PDF DOWNLOADED' : 'PREPARING PDF…'; } });
  } catch (error) {
    manifestoDownload.textContent = 'DOWNLOAD MANIFESTO PDF';
    window.alert(error.message);
  } finally {
    manifestoDownload.disabled = false;
    if (manifestoDownload.textContent === 'PDF DOWNLOADED') setTimeout(() => { manifestoDownload.textContent = 'DOWNLOAD MANIFESTO PDF'; }, 2400);
  }
});

if (feedbackSection && 'IntersectionObserver' in window) {
  const feedbackObserver = new IntersectionObserver((entries, observer) => { if (entries.some((entry) => entry.isIntersecting)) { loadFeedback(); observer.disconnect(); } }, { rootMargin: '240px' });
  feedbackObserver.observe(feedbackSection);
} else loadFeedback();
loadManifesto();
