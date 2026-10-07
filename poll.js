const pollForm = document.querySelector('#poll-form');
const pollOptions = document.querySelector('#poll-options');
const pollStatus = document.querySelector('#poll-status');
const pollThanks = document.querySelector('#poll-thanks');
const pollSubmit = document.querySelector('#poll-submit');

function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function showStatus(message, error = false) { pollStatus.textContent = message; pollStatus.classList.toggle('is-error', error); }

async function loadPoll() {
  try {
    const response = await fetch('/api/poll');
    const data = await response.json();
    if (!response.ok || !data.poll?.active) throw new Error(data.error || 'This poll is not currently open.');
    document.querySelector('#poll-title').textContent = data.poll.title;
    document.querySelector('#poll-intro').textContent = data.poll.intro;
    pollOptions.innerHTML = data.poll.options.map((option, index) => `<label class="poll-option"><input type="radio" name="priority" value="${index}" /><span class="poll-option-mark"></span><strong>${escapeHtml(option)}</strong></label>`).join('');
  } catch (error) {
    pollOptions.innerHTML = `<p class="form-status is-error">${escapeHtml(error.message)}</p>`;
    pollSubmit.disabled = true;
  }
}

pollForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const selected = pollForm.querySelector('input[name="priority"]:checked');
  if (!selected) return showStatus('Choose one priority to continue.', true);
  pollSubmit.disabled = true;
  showStatus('Recording your priority…');
  try {
    const response = await fetch('/api/poll/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ optionIndex: Number(selected.value) }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Your response could not be recorded.');
    pollForm.hidden = true;
    pollThanks.hidden = false;
  } catch (error) {
    showStatus(error.message, true);
    pollSubmit.disabled = false;
  }
});
loadPoll();
