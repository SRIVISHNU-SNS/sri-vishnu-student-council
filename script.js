const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');
const joinForm = document.querySelector('#join-form');
const formStatus = document.querySelector('#form-status');

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      mainNav.querySelectorAll('.nav-group[open]').forEach((group) => { group.removeAttribute('open'); });
    });
  });
}

if (joinForm && formStatus) {
  joinForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = joinForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    formStatus.textContent = 'Sending your application…';
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(joinForm)))
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Please try again.');
      formStatus.textContent = result.message;
      joinForm.reset();
    } catch (error) {
      formStatus.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
}
