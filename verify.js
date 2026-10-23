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
  panel.innerHTML = `<div class="verify-result-head"><div class="verify-stamp-stage" aria-hidden="true"><span class="verify-ink-ring"></span><span class="verify-approval-stamp"><span class="stamp-topline">OFFICIAL</span><svg class="stamp-check" viewBox="0 0 40 40" focusable="false"><path d="M8 21l8 8L32 12" /></svg><span class="stamp-word">VERIFIED</span></span></div><div><span class="verify-scan-label">SCAN COMPLETE</span><p class="status-pill status-active">ACTIVE MEMBERSHIP</p><h2>${escapeHtml(member.firstName)}</h2></div></div><div class="verify-details"><p><span>SECTION</span><strong>${escapeHtml(member.section || '—')}</strong></p>${member.clubName ? `<p><span>CLUB</span><strong>${escapeHtml(member.clubName)}</strong></p>` : ''}<p><span>ROLE</span><strong>${escapeHtml(member.role || 'Member')}</strong></p><p><span>MEMBER CODE</span><strong>${escapeHtml(member.memberCode)}</strong></p></div><small class="verify-approved">Approved ${new Date(member.approvedAt).toLocaleDateString()}</small>`;
}
function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
panel.classList.add('is-checking');
verify().catch((error) => { panel.classList.remove('is-checking', 'is-verified'); panel.classList.add('is-error'); panel.innerHTML = `<div class="verify-error-mark" aria-hidden="true">!</div><p class="form-status is-error">${escapeHtml(error.message)}</p>`; });
