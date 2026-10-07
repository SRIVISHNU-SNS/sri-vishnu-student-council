const candidateCard = document.querySelector('#candidate-card');
const candidateLinks = document.querySelector('#candidate-links');

function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function safeImageSource(value) { const source = String(value || ''); return /^(data:image\/|https?:\/\/|\/)/i.test(source) ? source : '/logo.webp'; }

async function loadCandidate() {
  try {
    const response = await fetch('/api/content/candidate');
    const { content } = await response.json();
    if (!content) return;
    document.querySelector('#candidate-eyebrow').textContent = content.eyebrow || 'STUDENT COUNCIL CANDIDATE';
    document.querySelector('#candidate-name').textContent = content.name || '';
    document.querySelector('#candidate-tagline').textContent = content.tagline || '';
    document.querySelector('#candidate-bio').textContent = content.bio || '';
    document.querySelector('#candidate-photo').src = safeImageSource(content.photo);
    document.querySelector('#candidate-photo').alt = `${content.name || 'Candidate'} portrait`;
    document.querySelector('#candidate-why-vote').textContent = content.whyVote || '';
    document.querySelector('#candidate-promises').innerHTML = (content.promises || []).slice(0, 5).map((promise) => `<li>${escapeHtml(promise)}</li>`).join('');
    const links = [];
    if (content.instagram) links.push(`<a class="outline-button" href="${escapeHtml(content.instagram)}" target="_blank" rel="noopener">INSTAGRAM</a>`);
    if (content.whatsapp) links.push(`<a class="outline-button" href="${escapeHtml(content.whatsapp)}" target="blank" rel="noopener">WHATSAPP</a>`);
    candidateLinks.innerHTML = links.join('');
  } catch (error) { document.querySelector('#candidate-bio').textContent = 'Candidate information is temporarily unavailable.'; }
}

document.querySelector('#share-candidate')?.addEventListener('click', async () => {
  const shareData = { title: document.title, text: document.querySelector('#candidate-tagline').textContent, url: window.location.href };
  try {
    if (navigator.share) await navigator.share(shareData);
    else { await navigator.clipboard.writeText(window.location.href); window.alert('Candidate profile link copied.'); }
  } catch (error) { if (error.name !== 'AbortError') window.alert('Copy this page URL to share the profile.'); }
});
document.querySelector('#print-candidate')?.addEventListener('click', () => window.print());
loadCandidate();
