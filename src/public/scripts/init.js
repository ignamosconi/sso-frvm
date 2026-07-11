// Lee el tema antes de que el navegador pinte, evitando flash
(function () {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme') === 'light' ? 'light' : 'dark';
  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('theme-' + theme);
  });
})();

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