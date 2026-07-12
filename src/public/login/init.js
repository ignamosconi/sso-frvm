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

  const params = new URLSearchParams(window.location.search);
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');

  if (!clientId || !redirectUri) {
    const form = document.getElementById('loginForm');
    const errorBox = document.getElementById('errorBox');

    if (form) form.style.display = 'none';

    if (errorBox) {
      errorBox.textContent = 'El enlace de acceso no es válido. Contactá al administrador de la aplicación.';
      errorBox.classList.add('visible');
    }
    return;
  }

  fetch(`/admin/clients/${clientId}/info`)
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data?.clientName) {
        const sub = document.getElementById('loginSub');
        if (sub) sub.textContent = `Ingresá a ${data.clientName} con tus credenciales de autogestión.`;
      }
    })
    .catch(() => {});
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