const token = window.location.pathname.split('/').filter(Boolean).pop();

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function copyToClipboard(btn, text) {
  try {
    await navigator.clipboard.writeText(text);
    const orig = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  } catch {
    // Clipboard API no disponible
  }
}

function buildFieldHtml(label, value, copyable = true) {
  const copyBtn = copyable
    ? `<button class="copy-btn" data-copy="${escHtml(value)}" title="Copiar">⎘</button>`
    : '';
  return `
    <div class="field">
      <div class="field-label">${escHtml(label)}</div>
      <div class="field-value">
        <code>${escHtml(value)}</code>
        ${copyBtn}
      </div>
    </div>
  `;
}

function buildUriListHtml(uris) {
  const items = uris.map(uri => `
    <div class="uri-item">
      <code>${escHtml(uri)}</code>
      <button class="copy-btn" data-copy="${escHtml(uri)}" title="Copiar">⎘</button>
    </div>
  `).join('');
  return `
    <div class="field">
      <div class="field-label">Redirect URIs registradas</div>
      <div class="uri-list">${items}</div>
    </div>
  `;
}

function renderSuccess(data) {
  return `
    <div class="card-title">Credenciales OAuth</div>
    <div class="card-sub">Aplicación: <strong>${escHtml(data.clientName)}</strong></div>

    <div class="alert">
      <span class="alert-icon">⚠️</span>
      <span>Este link es de <strong>un solo uso</strong> y ya no funcionará si recargás la página.</span>
    </div>

    <hr>

    ${buildFieldHtml('Client ID', String(data.id))}
    ${buildFieldHtml('Client Name', data.clientName, true)}
    ${buildFieldHtml('Client Secret', data.plainSecret)}
    ${buildUriListHtml(data.redirectUris)}
  `;
}

function renderError(status, message) {
  const isGone = status === 410;
  return `
    <div class="error-state">
      <div class="error-icon">${isGone ? '🔒' : '❌'}</div>
      <div class="error-title">${isGone ? 'Link ya utilizado o expirado' : 'Link inválido'}</div>
      <div class="error-sub">${escHtml(message || 'Este link no es válido. Contactá al administrador.')}</div>
    </div>
  `;
}

function renderConnectionError() {
  return `
    <div class="error-state">
      <div class="error-icon">❌</div>
      <div class="error-title">Error de conexión</div>
      <div class="error-sub">No se pudo conectar con el servidor. Intentá de nuevo.</div>
    </div>
  `;
}

function attachCopyListeners(card) {
  card.querySelectorAll('.copy-btn[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn, btn.dataset.copy));
  });
}

async function loadCredentials() {
  const card = document.getElementById('card');
  try {
    const res = await fetch(`/credentials/${token}/data`);
    const data = await res.json();

    if (!res.ok) {
      card.innerHTML = renderError(res.status, data.message);
      return;
    }

    card.innerHTML = renderSuccess(data);
    attachCopyListeners(card);

  } catch {
    card.innerHTML = renderConnectionError();
  }
}

loadCredentials();