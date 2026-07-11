async function executeLogin(event) {
  event.preventDefault();
  const errorBox = document.getElementById('errorBox');
  const legajo = document.getElementById('legajo').value;
  const password = document.getElementById('password').value;

  const params = new URLSearchParams(window.location.search);
  const client_id = params.get('client_id') || '';
  const redirect_uri = params.get('redirect_uri') || '';
  const state = params.get('state') || '';

  errorBox.classList.remove('visible');

  try {
    const response = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ legajo, password, client_id, redirect_uri, state })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error desconocido al autenticar.');
    }

    const isLight = params.get('theme') === 'light';

    const successBg    = isLight ? '#f5f5f5' : '#0f0f1a';
    const cardBg       = isLight ? '#ffffff'  : 'rgba(255,255,255,0.06)';
    const cardBorder   = isLight ? '#e0e0e0'  : 'rgba(255,255,255,0.12)';
    const successColor = isLight ? '#1a1a1a'  : '#ffffff';
    const subColor     = isLight ? '#666666'  : 'rgba(255,255,255,0.5)';

    //Lo dejamos acá y no hacemos su propia página porque no tiene sentido, habría que hacer un endpoint extra para mostrar 2 textos.
    document.body.style.background     = successBg;
    document.body.style.minHeight      = '100vh';
    document.body.style.display        = 'flex';
    document.body.style.alignItems     = 'center';
    document.body.style.justifyContent = 'center';
    document.body.style.margin         = '0';

    document.body.innerHTML = `
      <div style="text-align: center; font-family: 'Inter', sans-serif; padding: 2rem;">
        <div style="
          background: ${cardBg};
          border: 1px solid ${cardBorder};
          border-radius: 12px;
          padding: 1.5rem 2.5rem;
          display: inline-block;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          margin-bottom: 1.5rem;
        ">
          <div style="font-size: 18px; font-weight: 600; color: ${successColor}; margin-bottom: 6px;">
            ¡Logueo exitoso!
          </div>
          <div style="
            display: inline-block;
            background: #f5a705;
            color: #1a1200;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.06em;
            padding: 3px 10px;
            border-radius: 4px;
            text-transform: uppercase;
          ">Autenticado</div>
        </div>

        <p style="color: ${subColor}; font-size: 13px; margin: 0 0 2rem 0;">
          Cerrá esta página si sigue abierta.
        </p>

        <div style="animation: fadeIn 0.6s ease-out;">
          <img src="/app/assets/${isLight ? 'logo-completo.png' : 'logo-completo-light.png'}"
               alt="UTN FRVM"
               style="width: 100%; max-width: 260px; height: auto; opacity: ${isLight ? '1' : '0.85'};">
        </div>
      </div>
    `;

    if (window.opener) {
      // Ya no mandamos tokens, mandamos el code para que el backend de la app lo canjee
      window.opener.postMessage({ status: 'success', code: data.code, state: data.state }, '*');
    }

  } catch (err) {
    errorBox.classList.remove('visible');
    setTimeout(() => {
      errorBox.textContent = err.message;
      errorBox.classList.add('visible');
    }, 275);
  }
}