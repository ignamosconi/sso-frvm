window.addEventListener('load', () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const card = document.querySelector('.login-card');
      if (card) card.classList.add('visible');
    });
  });
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    document.body.style.display = 'none';
    window.location.reload();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').reset();
});