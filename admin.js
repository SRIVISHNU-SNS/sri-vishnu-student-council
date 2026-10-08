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
const manifestoDownloadCount = document.querySelector('#manifesto-download-count');
const adminFeedbackList = document.querySelector('#admin-feedback-list');
const feedbackAdminStatus = document.querySelector('#feedback-admin-status');
const pollAdminForm = document.querySelector('#poll-admin-form');
const pollOptionEditor = document.querySelector('#poll-option-editor');
const candidateForm = document.querySelector('#candidate-form');
const candidateImageInput = document.querySelector('#candidate-image');
const candidateStatus = document.querySelector('#candidate-status');
let manifestoState = { sections: [] };
let documentImages = [];
let manifestoImages = [];
let pollState = { options: [] };
let candidateImage = '';

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
    await Promise.all([loadApplications('all'), loadManifesto(), loadMemberships(), loadManifestoAnalytics(), loadAdminFeedback(), loadPollAdmin(), loadCandidateAdmin()]);
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
document.querySelector('#refresh-manifesto-analytics')?.addEventListener('click', () => loadManifestoAnalytics());
document.querySelector('#refresh-feedback')?.addEventListener('click', () => loadAdminFeedback());
document.querySelector('#add-poll-option')?.addEventListener('click', () => { if (pollState.options.length < 12) { pollState.options.push(''); renderPollOptionEditor(); } });
document.querySelector('#refresh-poll-report')?.addEventListener('click', () => loadPollReport());
document.querySelector('#reset-poll-votes')?.addEventListener('click', resetPollVotes);

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

async function loadManifestoAnalytics() {
  try {
    const { downloads } = await api('/api/admin/analytics/manifesto');
    if (manifestoDownloadCount) manifestoDownloadCount.textContent = Number(downloads || 0).toLocaleString();
  } catch (error) { showStatus(document.querySelector('#manifesto-status'), error.message, true); }
}

async function loadAdminFeedback() {
  try {
    const { comments } = await api('/api/admin/feedback/manifesto');
    adminFeedbackList.innerHTML = comments.length ? comments.map((comment) => `<article class="admin-feedback-card"><div><strong>${escapeHtml(comment.name || 'Anonymous')}</strong><time>${escapeHtml(new Date(comment.createdAt).toLocaleString())}</time></div><p>${escapeHtml(comment.message).replace(/\n/g, '<br />')}</p><button class="reject-button" data-delete-feedback="${comment.id}" type="button">DELETE COMMENT</button></article>`).join('') : '<p class="empty-state">No visitor feedback has been posted yet.</p>';
    adminFeedbackList.querySelectorAll('[data-delete-feedback]').forEach((button) => button.addEventListener('click', () => deleteFeedback(button.dataset.deleteFeedback)));
  } catch (error) { showStatus(feedbackAdminStatus, error.message, true); }
}

async function loadPollAdmin() {
  const { poll } = await api('/api/admin/poll');
  pollState = poll;
  pollAdminForm.elements.title.value = poll.title || '';
  pollAdminForm.elements.intro.value = poll.intro || '';
  pollAdminForm.elements.active.checked = Boolean(poll.active);
  renderPollOptionEditor();
  await loadPollReport();
}

function renderPollOptionEditor() {
  pollOptionEditor.innerHTML = pollState.options.map((option, index) => `<label>Option ${index + 1}<div class="poll-option-admin-row"><input data-poll-option="${index}" type="text" maxlength="160" value="${escapeAttribute(option)}" required /><button class="remove-section" data-remove-poll-option="${index}" type="button">Remove</button></div></label>`).join('');
  pollOptionEditor.querySelectorAll('[data-remove-poll-option]').forEach((button) => button.addEventListener('click', () => { if (pollState.options.length > 2) { pollState.options.splice(Number(button.dataset.removePollOption), 1); renderPollOptionEditor(); } }));
}

async function loadPollReport() {
  try {
    const { results, totalVotes } = await api('/api/admin/poll');
    document.querySelector('#poll-total-votes').textContent = Number(totalVotes || 0).toLocaleString();
    document.querySelector('#poll-results').innerHTML = results.map((result) => `<div class="poll-result-row"><div><strong>${escapeHtml(result.label)}</strong><span>${result.votes} vote${result.votes === 1 ? '' : 's'}</span></div><div class="poll-result-bar"><i style="width:${totalVotes ? Math.round((result.votes / totalVotes) * 100) : 0}%"></i></div></div>`).join('');
  } catch (error) { showStatus(document.querySelector('#poll-admin-status'), error.message, true); }
}

pollAdminForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const options = [...pollOptionEditor.querySelectorAll('[data-poll-option]')].map((input) => input.value.trim()).filter(Boolean);
  try { await api('/api/admin/poll', { method: 'PUT', body: JSON.stringify({ title: pollAdminForm.elements.title.value, intro: pollAdminForm.elements.intro.value, active: pollAdminForm.elements.active.checked, options }) }); showStatus(document.querySelector('#poll-admin-status'), 'Poll saved.'); await loadPollAdmin(); }
  catch (error) { showStatus(document.querySelector('#poll-admin-status'), error.message, true); }
});

async function resetPollVotes() {
  if (!window.confirm('Reset all private poll responses? This cannot be undone.')) return;
  try { await api('/api/admin/poll/reset', { method: 'POST' }); await loadPollReport(); showStatus(document.querySelector('#poll-admin-status'), 'Poll responses reset.'); }
  catch (error) { showStatus(document.querySelector('#poll-admin-status'), error.message, true); }
}

async function loadCandidateAdmin() {
  const { content } = await api('/api/admin/content/candidate');
  candidateForm.elements.name.value = content.name || '';
  candidateForm.elements.eyebrow.value = content.eyebrow || '';
  candidateForm.elements.tagline.value = content.tagline || '';
  candidateForm.elements.bio.value = content.bio || '';
  candidateForm.elements.whyVote.value = content.whyVote || '';
  candidateForm.elements.photo.value = content.photo || '';
  candidateForm.elements.instagram.value = content.instagram || '';
  candidateForm.elements.whatsapp.value = content.whatsapp || '';
  candidateImage = /^data:image\//i.test(content.photo || '') ? content.photo : '';
  candidateForm.dataset.promises = JSON.stringify(content.promises || []);
  renderCandidatePromises(JSON.parse(candidateForm.dataset.promises));
}

function renderCandidatePromises(promises) {
  const values = [...promises, '', '', '', '', ''].slice(0, 5);
  document.querySelector('#candidate-promises-editor').innerHTML = values.map((promise, index) => `<label>Promise ${index + 1}<input data-candidate-promise="${index}" type="text" maxlength="240" value="${escapeAttribute(promise)}" placeholder="A clear, measurable promise" /></label>`).join('');
}

candidateForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const promises = [...document.querySelectorAll('[data-candidate-promise]')].map((input) => input.value.trim()).filter(Boolean).slice(0, 5);
  const photo = candidateImage || candidateForm.elements.photo.value.trim();
  try { await api('/api/admin/content/candidate', { method: 'PUT', body: JSON.stringify({ name: candidateForm.elements.name.value, eyebrow: candidateForm.elements.eyebrow.value, tagline: candidateForm.elements.tagline.value, bio: candidateForm.elements.bio.value, whyVote: candidateForm.elements.whyVote.value, photo, promises, instagram: candidateForm.elements.instagram.value, whatsapp: candidateForm.elements.whatsapp.value }) }); showStatus(candidateStatus, 'Candidate profile saved.'); }
  catch (error) { showStatus(candidateStatus, error.message, true); }
});

candidateImageInput?.addEventListener('change', async () => {
  const file = candidateImageInput.files[0];
  if (!file) return;
  try { candidateImage = await compressManifestoImage(file); candidateForm.elements.photo.value = 'Uploaded image ready'; showStatus(candidateStatus, 'Profile image ready. Save the candidate profile to publish it.'); }
  catch (error) { showStatus(candidateStatus, 'The profile image could not be prepared.', true); }
});

async function deleteFeedback(id) {
  if (!window.confirm('Delete this comment from the public manifesto page?')) return;
  try { await api(`/api/admin/feedback/manifesto/${encodeURIComponent(id)}`, { method: 'DELETE' }); await loadAdminFeedback(); showStatus(feedbackAdminStatus, 'Comment deleted.'); }
  catch (error) { showStatus(feedbackAdminStatus, error.message, true); }
}

function documentValues() {
  const form = officialDocumentForm.elements;
  return { title: form.title.value.trim(), date: form.date.value, recipient: form.recipient.value.trim(), subject: form.subject.value.trim(), greeting: form.greeting.value.trim(), body: form.body.value.trim(), signatory: form.signatory.value.trim(), signatoryRole: form.signatoryRole.value.trim(), footer: form.footer.value.trim() };
}

function renderOfficialDocument() {
  const value = documentValues();
  const paragraphs = value.body ? value.body.split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`).join('') : '<p class="document-placeholder">Your document statement will appear here.</p>';
  const images = documentImages.map((image) => `<img src="${escapeAttribute(safeImageSource(image))}" alt="Document attachment" />`).join('');
  officialDocument.innerHTML = `<div class="official-letterhead"><img src="/letterhead-logo.png" alt="Sri Vishnu for Students General Council logo" /><div><p>SRI VISHNU FOR STUDENTS GENERAL COUNCIL</p><span>LISTEN · REPRESENT · DELIVER</span></div></div><div class="official-document-title"><p>${escapeHtml(value.title || 'CAMPAIGN UPDATE')}</p><time>${escapeHtml(value.date || '')}</time></div>${value.recipient ? `<p class="document-recipient"><strong>To:</strong> ${escapeHtml(value.recipient)}</p>` : ''}${value.subject ? `<p class="document-subject"><strong>Subject:</strong> ${escapeHtml(value.subject)}</p>` : ''}<p class="document-greeting">${escapeHtml(value.greeting || 'Hey everyone,')}</p><div class="document-body">${paragraphs}</div>${images ? `<div class="official-document-images">${images}</div>` : ''}<div class="document-signature"><p>With you,</p><strong>${escapeHtml(value.signatory || 'Your Name')}</strong><span>${escapeHtml(value.signatoryRole || 'Campaign team')}</span></div><div class="official-document-footer">${escapeHtml(value.footer || '')}</div>`;
  officialDocument.hidden = false;
}

officialDocumentForm?.addEventListener('submit', (event) => { event.preventDefault(); renderOfficialDocument(); showStatus(documentStatus, 'Preview generated. You can download the finished PDF directly.'); officialDocument.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

document.querySelector('#print-document')?.addEventListener('click', async (event) => {
  if (officialDocument.hidden) renderOfficialDocument();
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'PREPARING PDF…';
  try {
    const title = (documentValues().title || 'campaign-document').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'campaign-document';
    await downloadElementAsPdf(officialDocument, `${title}.pdf`, { onProgress: (message) => { button.textContent = message === 'PDF downloaded.' ? 'PDF DOWNLOADED' : 'PREPARING PDF…'; } });
  } catch (error) {
    showStatus(documentStatus, error.message, true);
    button.textContent = 'SHARE / SAVE PDF';
  } finally {
    button.disabled = false;
    if (button.textContent === 'PDF DOWNLOADED') setTimeout(() => { button.textContent = 'SHARE / SAVE PDF'; }, 2400);
  }
});

document.querySelector('#download-document-svg')?.addEventListener('click', async (event) => {
  if (officialDocument.hidden) renderOfficialDocument();
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'PREPARING SVG…';
  try {
    const title = (documentValues().title || 'campaign-document').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'campaign-document';
    await downloadElementAsSvg(officialDocument, `${title}.svg`, { onProgress: (message) => { button.textContent = message === 'SVG downloaded.' ? 'SVG DOWNLOADED' : 'PREPARING SVG…'; } });
  } catch (error) {
    showStatus(documentStatus, error.message, true);
    button.textContent = 'DOWNLOAD SVG';
  } finally {
    button.disabled = false;
    if (button.textContent === 'SVG DOWNLOADED') setTimeout(() => { button.textContent = 'DOWNLOAD SVG'; }, 2400);
  }
});

document.querySelector('#download-document-image')?.addEventListener('click', async (event) => {
  if (officialDocument.hidden) renderOfficialDocument();
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'PREPARING IMAGE…';
  try {
    const title = (documentValues().title || 'campaign-document').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'campaign-document';
    await downloadElementAsImage(officialDocument, `${title}.png`, { onProgress: (message) => { button.textContent = message === 'Image downloaded.' ? 'IMAGE DOWNLOADED' : 'PREPARING IMAGE…'; } });
  } catch (error) {
    showStatus(documentStatus, error.message, true);
    button.textContent = 'DOWNLOAD IMAGE';
  } finally {
    button.disabled = false;
    if (button.textContent === 'IMAGE DOWNLOADED') setTimeout(() => { button.textContent = 'DOWNLOAD IMAGE'; }, 2400);
  }
});

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
