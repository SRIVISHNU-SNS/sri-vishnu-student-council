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
  setTimeout(() => { playStampFeedback(); }, 1440);
  overlay.addEventListener('animationend', (event) => {
    if (event.target === overlay.querySelector('.verification-stamp')) overlay.remove();
  });
}
function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }

async function playStampFeedback() {
  try { navigator.vibrate?.([38, 24, 64]); } catch (error) { /* Vibration is optional and device-dependent. */ }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  let audio;
  try {
    audio = new AudioContextClass();
    if (audio.state === 'suspended') await audio.resume();
    if (audio.state !== 'running') return;
    const now = audio.currentTime;
    const thump = audio.createOscillator();
    const thumpGain = audio.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(112, now);
    thump.frequency.exponentialRampToValueAtTime(52, now + 0.19);
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.22, now + 0.012);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    thump.connect(thumpGain).connect(audio.destination);
    thump.start(now);
    thump.stop(now + 0.25);

    const click = audio.createOscillator();
    const clickGain = audio.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(430, now);
    click.frequency.exponentialRampToValueAtTime(170, now + 0.065);
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.exponentialRampToValueAtTime(0.075, now + 0.006);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    click.connect(clickGain).connect(audio.destination);
    click.start(now);
    click.stop(now + 0.1);
    setTimeout(() => audio.close().catch(() => {}), 400);
  } catch (error) {
    if (audio && audio.state !== 'closed') audio.close().catch(() => {});
  }
}

panel.classList.add('is-checking');
verify().catch((error) => { panel.classList.remove('is-checking', 'is-verified'); panel.classList.add('is-error'); panel.innerHTML = `<div class="verify-error-mark" aria-hidden="true">!</div><p class="form-status is-error">${escapeHtml(error.message)}</p>`; });
