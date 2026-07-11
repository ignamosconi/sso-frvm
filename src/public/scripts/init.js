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

  // Carga el client_name desde la API si hay client_id en la URL
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get('client_id');
  if (clientId) {
    fetch(`/admin/clients/${clientId}/info`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.clientName) {
          const sub = document.getElementById('loginSub');
          if (sub) sub.textContent = `Ingresá a ${data.clientName} con tus credenciales de autogestión.`;
        }
      })
      .catch(() => {}); // Si falla, se queda con el texto por defecto
  }
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