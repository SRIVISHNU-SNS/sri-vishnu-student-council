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
    });
  });
}

if (joinForm && formStatus) {
  joinForm.addEventListener('submit', (event) => {
    event.preventDefault();
    formStatus.textContent = 'Thanks for stepping up — we’ll be in touch soon.';
    joinForm.reset();
  });
}
