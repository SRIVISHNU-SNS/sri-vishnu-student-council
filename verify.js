const code = new URLSearchParams(window.location.search).get('code');
const panel = document.querySelector('#verify-panel');

async function verify() {
  if (!code) throw new Error('No membership code was provided.');
  const response = await fetch(`/api/memberships/${encodeURIComponent(code)}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Membership could not be verified.');
  const member = result.member;
  panel.innerHTML = `<div class="verified-mark">✓</div><p class="status-pill status-active">ACTIVE MEMBERSHIP</p><h2>${escapeHtml(member.firstName)}</h2><p>Section: <strong>${escapeHtml(member.section)}</strong></p><p>Member code: <strong>${escapeHtml(member.memberCode)}</strong></p><small>Approved ${new Date(member.approvedAt).toLocaleDateString()}</small>`;
}
function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
verify().catch((error) => { panel.innerHTML = `<p class="form-status is-error">${escapeHtml(error.message)}</p>`; });
