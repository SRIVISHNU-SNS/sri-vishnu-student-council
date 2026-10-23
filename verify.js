const code = new URLSearchParams(window.location.search).get('code');
const panel = document.querySelector('#verify-panel');

async function verify() {
  if (!code) throw new Error('No membership code was provided.');
  const response = await fetch(`/api/memberships/${encodeURIComponent(code)}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Membership could not be verified.');
  const member = result.member;
  panel.classList.remove('is-checking', 'is-error');
  panel.classList.add('is-verified');
  panel.innerHTML = `<div class="verify-result-head"><div class="verify-imprint" aria-label="Verified membership"><span>VERIFIED</span><strong>✓</strong></div><div><p class="status-pill status-active">ACTIVE MEMBERSHIP</p><h2>${escapeHtml(member.firstName)}</h2></div></div><div class="verify-details"><p><span>SECTION</span><strong>${escapeHtml(member.section || '—')}</strong></p>${member.clubName ? `<p><span>CLUB</span><strong>${escapeHtml(member.clubName)}</strong></p>` : ''}<p><span>ROLE</span><strong>${escapeHtml(member.role || 'Member')}</strong></p><p><span>MEMBER CODE</span><strong>${escapeHtml(member.memberCode)}</strong></p></div><small class="verify-approved">Approved ${new Date(member.approvedAt).toLocaleDateString()}</small>`;
  const overlay = document.createElement('div');
  overlay.className = 'verification-stamp-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<div class="verification-ink" aria-hidden="true"><span>VERIFIED</span><strong>✓</strong></div><div class="verification-stamp" aria-hidden="true"><span class="stamp-handle"></span><span class="stamp-stem"></span><span class="stamp-base"><i></i></span></div>';
  document.body.append(overlay);
  overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
}
function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
panel.classList.add('is-checking');
verify().catch((error) => { panel.classList.remove('is-checking', 'is-verified'); panel.classList.add('is-error'); panel.innerHTML = `<div class="verify-error-mark" aria-hidden="true">!</div><p class="form-status is-error">${escapeHtml(error.message)}</p>`; });
