const login = document.querySelector('#admin-login');
const dashboard = document.querySelector('#admin-dashboard');
const loginForm = document.querySelector('#admin-login-form');
const loginStatus = document.querySelector('#login-status');
const applicationList = document.querySelector('#application-list');
const membershipList = document.querySelector('#membership-list');
const manifestoForm = document.querySelector('#manifesto-form');
let manifestoState = { sections: [] };

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function showStatus(element, message, error = false) { element.textContent = message; element.classList.toggle('is-error', error); }

async function checkSession() {
  const session = await api('/api/admin/session');
  if (session.authenticated) {
    login.hidden = true; dashboard.hidden = false;
    document.querySelector('#admin-identity').textContent = `Signed in as ${session.email}`;
    await Promise.all([loadApplications('all'), loadManifesto(), loadMemberships()]);
  } else { login.hidden = false; dashboard.hidden = true; }
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  showStatus(loginStatus, 'Opening dashboard…');
  try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: document.querySelector('#admin-email').value }) }); await checkSession(); }
  catch (error) { showStatus(loginStatus, error.message, true); }
});

document.querySelector('#logout-button')?.addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }); window.location.reload(); });
document.querySelector('#refresh-button')?.addEventListener('click', () => checkSession());

document.querySelectorAll('.admin-tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.admin-tab').forEach((item) => item.classList.toggle('is-active', item === tab));
  document.querySelectorAll('.admin-panel-content').forEach((panel) => { panel.hidden = panel.id !== `${tab.dataset.tab}-panel`; });
}));

document.querySelectorAll('.filter-button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.filter-button').forEach((item) => item.classList.toggle('is-active', item === button));
  loadApplications(button.dataset.status);
}));

document.querySelector('#add-section')?.addEventListener('click', () => { manifestoState.sections.push({ heading: '', body: '' }); renderManifestoEditor(); });

async function loadApplications(status) {
  try {
    const { applications } = await api(`/api/admin/applications${status === 'all' ? '' : `?status=${encodeURIComponent(status)}`}`);
    applicationList.innerHTML = applications.length ? applications.map((application) => `<article class="application-card"><div class="application-main"><span class="status-pill status-${application.status}">${application.status}</span><h2>${escapeHtml(application.firstName)}</h2><p>${escapeHtml(application.email)} · ${escapeHtml(application.section)}${application.mobile ? ` · ${escapeHtml(application.mobile)}` : ''}</p><small>Applied ${new Date(application.createdAt).toLocaleString()}</small>${application.reviewNote ? `<p class="review-note">${escapeHtml(application.reviewNote)}</p>` : ''}</div><div class="application-actions">${application.status === 'accepted' && application.memberCode ? `<a class="outline-button" href="/membership-card.html?code=${encodeURIComponent(application.memberCode)}" target="_blank">VIEW CARD</a>` : ''}${application.status !== 'accepted' ? `<button class="accept-button" data-id="${application.id}" type="button">ACCEPT</button>` : ''}${application.status !== 'rejected' ? `<button class="reject-button" data-id="${application.id}" type="button">REJECT</button>` : ''}</div></article>`).join('') : '<p class="empty-state">No applications in this view.</p>';
    applicationList.querySelectorAll('[data-id]').forEach((button) => button.addEventListener('click', () => decideApplication(button.dataset.id, button.classList.contains('accept-button') ? 'accepted' : 'rejected')));
  } catch (error) { applicationList.innerHTML = `<p class="form-status is-error">${escapeHtml(error.message)}</p>`; }
}

async function decideApplication(id, decision) {
  const reviewNote = window.prompt(decision === 'accepted' ? 'Optional note for this accepted application:' : 'Optional reason for rejecting this application:', '') ?? '';
  try { const result = await api(`/api/admin/applications/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, reviewNote }) }); await loadApplications('all'); await loadMemberships(); if (result.memberCode) window.open(`/membership-card.html?code=${encodeURIComponent(result.memberCode)}`, '_blank'); }
  catch (error) { window.alert(error.message); }
}

async function loadManifesto() {
  const { content } = await api('/api/admin/content/manifesto');
  manifestoState = content || { title: '', intro: '', sections: [], closing: '', photos: [] };
  manifestoForm.elements.title.value = manifestoState.title || '';
  manifestoForm.elements.intro.value = manifestoState.intro || '';
  manifestoForm.elements.closing.value = manifestoState.closing || '';
  manifestoForm.elements.photos.value = (manifestoState.photos || []).join('\n');
  renderManifestoEditor();
}

function renderManifestoEditor() {
  const editor = document.querySelector('#manifesto-section-editor');
  editor.innerHTML = (manifestoState.sections || []).map((section, index) => `<div class="editable-section"><div class="editable-section-head"><strong>Section ${index + 1}</strong><button class="remove-section" data-index="${index}" type="button">Remove</button></div><label>Heading<input data-section-heading="${index}" type="text" value="${escapeHtml(section.heading)}" /></label><label>Body<textarea data-section-body="${index}" rows="4">${escapeHtml(section.body)}</textarea></label></div>`).join('');
  editor.querySelectorAll('.remove-section').forEach((button) => button.addEventListener('click', () => { manifestoState.sections.splice(Number(button.dataset.index), 1); renderManifestoEditor(); }));
}

manifestoForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const sections = [...document.querySelectorAll('.editable-section')].map((section) => ({ heading: section.querySelector('[data-section-heading]')?.value || '', body: section.querySelector('[data-section-body]')?.value || '' }));
  const payload = { title: manifestoForm.elements.title.value, intro: manifestoForm.elements.intro.value, closing: manifestoForm.elements.closing.value, photos: manifestoForm.elements.photos.value.split('\n').map((item) => item.trim()).filter(Boolean), sections };
  try { await api('/api/admin/content/manifesto', { method: 'PUT', body: JSON.stringify(payload) }); showStatus(document.querySelector('#manifesto-status'), 'Manifesto saved.'); }
  catch (error) { showStatus(document.querySelector('#manifesto-status'), error.message, true); }
});

async function loadMemberships() {
  const { memberships } = await api('/api/admin/memberships');
  membershipList.innerHTML = memberships.length ? memberships.map((member) => `<article class="membership-row"><div><span class="status-pill status-${member.status}">${member.status}</span><h2>${escapeHtml(member.firstName)}</h2><p>${escapeHtml(member.memberCode)} · ${escapeHtml(member.section)} · ${escapeHtml(member.email)}</p></div><a class="outline-button" href="/membership-card.html?code=${encodeURIComponent(member.memberCode)}" target="_blank">OPEN CARD</a></article>`).join('') : '<p class="empty-state">No memberships yet. Accept an application to create one.</p>';
}

checkSession().catch((error) => showStatus(loginStatus, error.message, true));
