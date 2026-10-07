const login = document.querySelector('#admin-login');
const dashboard = document.querySelector('#admin-dashboard');
const loginForm = document.querySelector('#admin-login-form');
const loginStatus = document.querySelector('#login-status');
const applicationList = document.querySelector('#application-list');
const membershipList = document.querySelector('#membership-list');
const manifestoForm = document.querySelector('#manifesto-form');
const officialDocumentForm = document.querySelector('#official-document-form');
const officialDocument = document.querySelector('#official-document');
const documentStatus = document.querySelector('#document-status');
const documentImagesInput = document.querySelector('#document-images');
const manifestoImagesInput = document.querySelector('#manifesto-images');
const manifestoImageStatus = document.querySelector('#manifesto-image-status');
let manifestoState = { sections: [] };
let documentImages = [];
let manifestoImages = [];

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function escapeAttribute(value) { return escapeHtml(value).replace(/javascript:/gi, ''); }
function showStatus(element, message, error = false) { if (!element) return; element.textContent = message; element.classList.toggle('is-error', error); }
function safeImageSource(value) { const source = String(value || ''); return /^(data:image\/|https:\/\/|http:\/\/|\/)/i.test(source) ? source : ''; }

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
    applicationList.innerHTML = applications.length ? applications.map((application) => `<article class="application-card"><div class="application-main"><span class="status-pill status-${escapeAttribute(application.status)}">${escapeHtml(application.status)}</span><h2>${escapeHtml(application.firstName)}</h2><p>${escapeHtml(application.email)} · ${escapeHtml(application.section)}${application.mobile ? ` · ${escapeHtml(application.mobile)}` : ''}</p><small>Applied ${new Date(application.createdAt).toLocaleString()}</small>${application.reviewNote ? `<p class="review-note">${escapeHtml(application.reviewNote)}</p>` : ''}</div><div class="application-actions"><label class="role-control">ASSIGN ROLE<input data-role-id="${application.id}" type="text" maxlength="120" value="${escapeAttribute(application.role || 'Member')}" placeholder="Member / President / Any role" /></label>${application.status === 'accepted' && application.memberCode ? `<a class="outline-button" href="/membership-card.html?code=${encodeURIComponent(application.memberCode)}" target="_blank">VIEW CARD</a><button class="role-button" data-role-save="${application.id}" type="button">SAVE ROLE</button>` : ''}${application.status !== 'accepted' ? `<button class="accept-button" data-id="${application.id}" data-decision="accepted" type="button">ACCEPT</button>` : ''}${application.status !== 'rejected' ? `<button class="reject-button" data-id="${application.id}" data-decision="rejected" type="button">REJECT</button>` : ''}</div></article>`).join('') : '<p class="empty-state">No applications in this view.</p>';
    applicationList.querySelectorAll('button[data-id]').forEach((button) => button.addEventListener('click', () => decideApplication(button.dataset.id, button.dataset.decision)));
    applicationList.querySelectorAll('[data-role-save]').forEach((button) => button.addEventListener('click', () => saveRole(button.dataset.roleSave)));
  } catch (error) { applicationList.innerHTML = `<p class="form-status is-error">${escapeHtml(error.message)}</p>`; }
}

function roleForApplication(id) { return document.querySelector(`[data-role-id="${CSS.escape(String(id))}"]`)?.value.trim() || 'Member'; }

async function decideApplication(id, decision) {
  const reviewNote = window.prompt(decision === 'accepted' ? 'Optional note for this accepted application:' : 'Optional reason for rejecting this application:', '') ?? '';
  try { const result = await api(`/api/admin/applications/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, reviewNote, role: roleForApplication(id) }) }); await loadApplications('all'); await loadMemberships(); if (result.memberCode) window.open(`/membership-card.html?code=${encodeURIComponent(result.memberCode)}`, '_blank'); }
  catch (error) { window.alert(error.message); }
}

async function saveRole(id) {
  try { await api(`/api/admin/applications/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'accepted', role: roleForApplication(id), reviewNote: '' }) }); await loadApplications('all'); await loadMemberships(); }
  catch (error) { window.alert(error.message); }
}

async function loadManifesto() {
  const { content } = await api('/api/admin/content/manifesto');
  manifestoState = content || { title: '', intro: '', sections: [], closing: '', photos: [] };
  manifestoImages = (manifestoState.photos || []).filter((photo) => /^data:image\//i.test(photo));
  manifestoForm.elements.kicker.value = manifestoState.kicker || 'OUR MANIFESTO';
  manifestoForm.elements.title.value = manifestoState.title || '';
  manifestoForm.elements.intro.value = manifestoState.intro || '';
  manifestoForm.elements.closing.value = manifestoState.closing || '';
  manifestoForm.elements.photos.value = (manifestoState.photos || []).filter((photo) => !/^data:image\//i.test(photo)).join('\n');
  showStatus(manifestoImageStatus, manifestoImages.length ? `${manifestoImages.length} saved image${manifestoImages.length === 1 ? '' : 's'} loaded.` : 'No uploaded images selected.');
  renderManifestoEditor();
}

function renderManifestoEditor() {
  const editor = document.querySelector('#manifesto-section-editor');
  editor.innerHTML = (manifestoState.sections || []).map((section, index) => `<div class="editable-section"><div class="editable-section-head"><strong>Section ${index + 1}</strong><button class="remove-section" data-index="${index}" type="button">Remove</button></div><label>Heading<input data-section-heading="${index}" type="text" value="${escapeAttribute(section.heading)}" /></label><label>Body<textarea data-section-body="${index}" rows="4">${escapeHtml(section.body)}</textarea></label></div>`).join('');
  editor.querySelectorAll('.remove-section').forEach((button) => button.addEventListener('click', () => { manifestoState.sections.splice(Number(button.dataset.index), 1); renderManifestoEditor(); }));
}

manifestoForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const sections = [...document.querySelectorAll('.editable-section')].map((section) => ({ heading: section.querySelector('[data-section-heading]')?.value || '', body: section.querySelector('[data-section-body]')?.value || '' }));
  const typedPhotos = manifestoForm.elements.photos.value.split('\n').map((item) => item.trim()).filter(Boolean);
  const payload = { kicker: manifestoForm.elements.kicker.value, title: manifestoForm.elements.title.value, intro: manifestoForm.elements.intro.value, closing: manifestoForm.elements.closing.value, photos: [...typedPhotos, ...manifestoImages].slice(0, 8), sections };
  try { await api('/api/admin/content/manifesto', { method: 'PUT', body: JSON.stringify(payload) }); showStatus(document.querySelector('#manifesto-status'), 'Manifesto saved.'); }
  catch (error) { showStatus(document.querySelector('#manifesto-status'), error.message, true); }
});

function compressManifestoImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxSize = 1600;
        const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

manifestoImagesInput?.addEventListener('change', async () => {
  const files = [...manifestoImagesInput.files].slice(0, 8).filter((file) => file.type.startsWith('image/') && file.size <= 8 * 1024 * 1024);
  try {
    manifestoImages = await Promise.all(files.map(compressManifestoImage));
    showStatus(manifestoImageStatus, `${manifestoImages.length} manifesto image${manifestoImages.length === 1 ? '' : 's'} ready. Save the manifesto to publish them.`);
  } catch (error) { showStatus(manifestoImageStatus, 'One of the images could not be prepared.', true); }
});

async function loadMemberships() {
  const { memberships } = await api('/api/admin/memberships');
  membershipList.innerHTML = memberships.length ? memberships.map((member) => `<article class="membership-row"><div><span class="status-pill status-${escapeAttribute(member.status)}">${escapeHtml(member.status)}</span><h2>${escapeHtml(member.firstName)}</h2><p><strong>${escapeHtml(member.role || 'Member')}</strong> · ${escapeHtml(member.memberCode)} · ${escapeHtml(member.section)} · ${escapeHtml(member.email)}</p></div><a class="outline-button" href="/membership-card.html?code=${encodeURIComponent(member.memberCode)}" target="_blank">OPEN CARD</a></article>`).join('') : '<p class="empty-state">No memberships yet. Accept an application to create one.</p>';
}

function documentValues() {
  const form = officialDocumentForm.elements;
  return { title: form.title.value.trim(), date: form.date.value, recipient: form.recipient.value.trim(), subject: form.subject.value.trim(), greeting: form.greeting.value.trim(), body: form.body.value.trim(), signatory: form.signatory.value.trim(), signatoryRole: form.signatoryRole.value.trim(), footer: form.footer.value.trim() };
}

function renderOfficialDocument() {
  const value = documentValues();
  const paragraphs = value.body ? value.body.split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`).join('') : '<p class="document-placeholder">Your document statement will appear here.</p>';
  const images = documentImages.map((image) => `<img src="${escapeAttribute(safeImageSource(image))}" alt="Document attachment" />`).join('');
  officialDocument.innerHTML = `<div class="official-letterhead"><img src="/logo.webp" alt="Sri Vishnu for Students General Council" /><div><p>SRI VISHNU FOR STUDENTS GENERAL COUNCIL</p><span>LISTEN · REPRESENT · DELIVER</span></div><span class="document-mark">OFFICIAL</span></div><div class="official-document-title"><p>${escapeHtml(value.title || 'OFFICIAL COMMUNICATION')}</p><time>${escapeHtml(value.date || '')}</time></div>${value.recipient ? `<p class="document-recipient"><strong>To:</strong> ${escapeHtml(value.recipient)}</p>` : ''}${value.subject ? `<p class="document-subject"><strong>Subject:</strong> ${escapeHtml(value.subject)}</p>` : ''}<p class="document-greeting">${escapeHtml(value.greeting || 'Dear Sir / Madam,')}</p><div class="document-body">${paragraphs}</div>${images ? `<div class="official-document-images">${images}</div>` : ''}<div class="document-signature"><p>Yours sincerely,</p><strong>${escapeHtml(value.signatory || 'Authorized Representative')}</strong><span>${escapeHtml(value.signatoryRole || 'Sri Vishnu for Students General Council')}</span></div><div class="official-document-footer">${escapeHtml(value.footer || '')}</div>`;
  officialDocument.hidden = false;
}

officialDocumentForm?.addEventListener('submit', (event) => { event.preventDefault(); renderOfficialDocument(); showStatus(documentStatus, 'Preview generated. Review it below, then print or save as PDF.'); officialDocument.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

document.querySelector('#print-document')?.addEventListener('click', () => { if (officialDocument.hidden) renderOfficialDocument(); setTimeout(() => window.print(), 100); });

documentImagesInput?.addEventListener('change', () => {
  const files = [...documentImagesInput.files].slice(0, 3);
  documentImages = [];
  files.forEach((file) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => { documentImages.push(reader.result); showStatus(documentStatus, `${documentImages.length} image${documentImages.length === 1 ? '' : 's'} ready for the document.`); };
    reader.readAsDataURL(file);
  });
});

officialDocumentForm?.elements.date && (officialDocumentForm.elements.date.value = new Date().toISOString().slice(0, 10));
checkSession().catch((error) => showStatus(loginStatus, error.message, true));
