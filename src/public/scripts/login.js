async function executeLogin(event) {
  event.preventDefault();
  const errorBox = document.getElementById('errorBox');
  const legajo = document.getElementById('legajo').value;
  const password = document.getElementById('password').value;

  errorBox.classList.remove('visible');

  try {
    const response = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ legajo, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error desconocido al autenticar.');
    }

    //TODO: Refactorizar a su propia página?
    document.body.style.background = '#ffffff';
    document.body.style.minHeight = '100vh';
    document.body.style.display = 'flex';
    document.body.style.alignItems = 'center';
    document.body.style.justifyContent = 'center';
    document.body.style.margin = '0';

    document.body.innerHTML = `
      <div style="text-align: center; font-family: 'Inter', sans-serif; padding: 2rem;">
        <div style="
          background-color: #ecfdf5; 
          border: 1px solid #10b981; 
          color: #065f46; 
          padding: 1rem 2.5rem; 
          border-radius: 8px; 
          display: inline-block; 
          font-size: 18px; 
          font-weight: 600; 
          margin-bottom: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        ">
          ¡Logueo exitoso!
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin: 0 0 2.5rem 0;">
          Podés cerrar esta página ahora.
        </p>

        <div style="animation: fadeIn 0.6s ease-out;">
          <img src="/app/assets/logo-completo.png" alt="UTN FRVM" style="
            width: 100%;
            max-width: 280px;
            height: auto;
            opacity: 0.9;
          ">
        </div>
      </div>
    `;

    if (window.opener) {
      window.opener.postMessage({ status: 'success', user: data }, '*');
    }

  } catch (err) {
    errorBox.classList.remove('visible');
    setTimeout(() => {
    errorBox.textContent = err.message;
    errorBox.classList.add('visible');
    }, 275);                                //Tiempo que tarda la animación de "colapsar" en el login
  }
}