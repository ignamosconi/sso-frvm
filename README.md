# SSO FRVM — Backend

Sistema de autenticación único (SSO) para aplicaciones integradas con UTN FRVM. Permite que cualquier app registrada en el sistema pueda autenticar alumnos usando sus credenciales de Autogestión, sin que esas credenciales sean compartidas con la app integradora.

## ¿Qué hace este repositorio?

Implementa un servidor OAuth 2.0 con flujo de authorization code que:

- Valida las credenciales de alumnos contra el endpoint público de Autogestión UTN FRVM.
- Emite authorization codes de un solo uso (TTL configurable, por defecto 2 minutos).
- Intercambia esos codes por access tokens y refresh tokens JWT.
- Expone un endpoint `/sso/me` para que las apps integradoras identifiquen al alumno autenticado.
- Provee un panel de administración (repositorio separado) para gestionar administradores del sistema y aplicaciones cliente registradas.
- Implementa 2FA obligatorio (TOTP) para todos los administradores.
- Usa links de un solo uso con cifrado AES-256-GCM para la entrega de client secrets.


## Tecnologías utilizadas

- **Runtime:** Node.js 22
- **Framework:** NestJS 11
- **Base de datos:** PostgreSQL con TypeORM (migraciones, sin `synchronize`)
- **Autenticación:** JWT HS256 (access + refresh tokens con rotación), TOTP via `otplib`
- **Validación:** class-validator + class-transformer con `ValidationPipe` global
- **Seguridad:** Helmet, `@nestjs/throttler`, bcrypt (cost 12 para admins, 10 para client secrets), AES-256-GCM para secrets en reposo
- **Email:** Nodemailer (SMTP)
- **Documentación:** Swagger UI (protegido con Basic Auth)
- **Tests:** Jest + ts-jest
- **CI:** GitHub Actions

## ¿Cómo integro mi app con el SSO?

### 1. Obtener credenciales

Para poder integrar tu app con el SSO necesitás un **Client ID** y un **Client Secret**. Estos los entrega el equipo de sistemas de UTN FRVM al registrar tu app.

Al registrar tu app vas a recibir un email con un link de un solo uso. Ese link expira en 24 horas y solo puede abrirse una vez. Al abrirlo vas a ver:

- **Client ID** — número entero que identifica tu app.
- **Client Secret** — string de 64 caracteres hexadecimales. Guardalo en un lugar seguro. Si lo perdés, el equipo de sistemas puede regenerarlo.

> **Importante:** el Client Secret nunca debe estar en el frontend de tu app. Debe estar exclusivamente en tu backend.


### 2. Flujo de autenticación

El SSO usa el flujo **OAuth 2.0 Authorization Code**. El popup de login lo provee el SSO; vos solo tenés que abrirlo y escuchar el resultado.

#### Paso 1 — Abrir el popup de login

Desde tu frontend, abrí un popup apuntando al login del SSO:

```javascript
const state = crypto.randomUUID(); // valor aleatorio para prevenir CSRF
sessionStorage.setItem('oauth_state', state);

const popup = window.open(
  `https://sso.frvm.utn.edu.ar/sso/login` +
  `?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent('https://tu-app.com/callback')}` +
  `&state=${state}`,
  'sso_login',
  'width=480,height=600'
);
```

(!) El popup de login del SSO soporta modo oscuro y modo claro. Podés pasarle el parámetro theme=light o theme=dark en la URL para que coincida con el tema de tu app.

#### Paso 2 — Escuchar el resultado

El popup envía el authorization code vía `postMessage`. Verificá siempre el origen y el state antes de procesarlo:

```javascript
window.addEventListener('message', (event) => {
  // Verificar que el mensaje viene del SSO
  if (event.origin !== 'https://sso.frvm.utn.edu.ar') return;

  const { code, state } = event.data;

  // Verificar que el state coincide con el que generamos
  if (state !== sessionStorage.getItem('oauth_state')) {
    console.error('State inválido — posible ataque CSRF');
    return;
  }

  sessionStorage.removeItem('oauth_state');

  // Enviar el code a tu backend para canjear por tokens
  fetch('/tu-backend/auth/callback', {
    method: 'POST',
    body: JSON.stringify({ code }),
    headers: { 'Content-Type': 'application/json' },
  });
});
```

#### Paso 3 — Canjear el code por tokens (desde tu backend)

El code es de un solo uso y expira en 2 minutos. Canjealo inmediatamente desde tu backend:

```http
POST https://sso.frvm.utn.edu.ar/sso/token
Content-Type: application/json

{
  "client_id": "TU_CLIENT_ID",
  "client_secret": "TU_CLIENT_SECRET",
  "code": "EL_CODE_RECIBIDO",
  "redirect_uri": "https://tu-app.com/callback"
}
```

Respuesta:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

Guardá ambos tokens en tu backend. **Nunca los expongas al frontend.**

#### Paso 4 — Identificar al alumno autenticado

Con el access token podés obtener los datos del alumno:

```http
GET https://sso.frvm.utn.edu.ar/sso/me
Authorization: Bearer ACCESS_TOKEN
```

Respuesta:

```json
{
  "sub": "131601",
  "nombre": "Ignacio Mariano",
  "apellido": "Mosconi",
  "legajo": "13692",
  "carrera": "Ingeniería en Sistemas de Información",
  "email": "alumno@gmail.com",
  "grupo": "Alumno"
}
```

Usá el campo `sub` como identificador único del alumno en tu sistema. Es el ID interno de Autogestión y no cambia.

#### Paso 5 — Renovar el access token

El access token expira en 15 minutos. Cuando expire, renovalo con el refresh token desde tu backend:

```http
POST https://sso.frvm.utn.edu.ar/sso/refresh
Content-Type: application/json

{
  "refresh_token": "TU_REFRESH_TOKEN"
}
```

Respuesta: nuevos `access_token` y `refresh_token`. Reemplazá ambos — el refresh token anterior queda inválido (rotación automática).

> Si intentás usar un refresh token que ya fue usado, el servidor detecta una posible reutilización maliciosa y **revoca toda la sesión**. El alumno tendrá que volver a loguearse.

#### Paso 6 — Cerrar sesión

Para cerrar la sesión del alumno, revocá el refresh token desde tu backend:

```http
POST https://sso.frvm.utn.edu.ar/sso/logout
Content-Type: application/json

{
  "refresh_token": "TU_REFRESH_TOKEN"
}
```

Respuesta: `204 No Content`. El access token expira naturalmente en máximo 15 minutos.


### Consideraciones de seguridad

- **Verificá siempre `event.origin`** en el listener de `postMessage`.
- **Verificá siempre el `state`** para prevenir ataques CSRF en el flujo OAuth.
- **Nunca guardes el Client Secret en el frontend** — debe estar exclusivamente en tu backend.
- **Nunca guardes access o refresh tokens en `localStorage`** — usá cookies `HttpOnly` o almacenamiento en servidor.
- El code de autorización es de un solo uso y expira en 2 minutos.
- El refresh token rota en cada uso — guardá siempre el último que recibís.


## Levantar el proyecto localmente

### Requisitos previos

- Node.js 22+
- PostgreSQL 14+
- Una cuenta SMTP (Gmail con App Password funciona)

### Instalación

```bash
git clone https://github.com/ignamosconi/sso-frvm.git
cd sso-frvm
npm install
```

### Variables de entorno

Copiá el archivo de ejemplo y completá los valores:

```bash
cp .env.example .env
```

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Entorno. En `production` activa validaciones de secretos y desactiva el seeder. | `development` |
| `PORT` | Puerto en el que escucha el servidor. | `3000` |
| `AUTH_ROUTE_PATH` | Prefijo de ruta para los endpoints SSO de alumnos. | `sso` |
| `CODE_TTL_MS` | TTL del authorization code en milisegundos. | `120000` |
| `CREDENTIAL_TOKEN_TTL_MS` | TTL del link de credenciales de un solo uso en ms. | `86400000` |
| `CREDENTIAL_ENCRYPTION_KEY` | Clave AES-256-GCM para cifrar secrets en reposo. **64 chars hex.** Generá con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | — |
| `TOTP_ENCRYPTION_KEY` | Clave AES-256-GCM para cifrar secrets TOTP en reposo. **64 chars hex.** Mismo comando. | — |
| `AUTOGESTION_BASE_URL` | URL base del endpoint público de Autogestión UTN FRVM. | `https://webservice.frvm.utn.edu.ar/autogestion` |
| `ADMIN_PANEL_URL` | URL del panel de administración (para CORS). | `http://localhost:5173` |
| `SSO_BASE_URL` | URL pública de este backend (usada en emails). | `http://localhost:3000` |
| `DB_HOST` | Host de PostgreSQL. | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL. | `5432` |
| `DB_USERNAME` | Usuario de PostgreSQL. | `postgres` |
| `DB_PASSWORD` | Password de PostgreSQL. | `postgres` |
| `DB_NAME` | Nombre de la base de datos. | `sso_frvm` |
| `JWT_ACCESS_SECRET` | Secret para firmar access tokens de alumnos. Mínimo 64 chars. | — |
| `JWT_REFRESH_SECRET` | Secret para firmar refresh tokens de alumnos. Distinto al anterior. | — |
| `JWT_ACCESS_EXPIRES_IN` | Expiración del access token de alumnos. | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Expiración del refresh token de alumnos. | `1d` |
| `JWT_ADMIN_ACCESS_SECRET` | Secret para access tokens de admins. Distinto a los de alumnos. | — |
| `JWT_ADMIN_REFRESH_SECRET` | Secret para refresh tokens de admins. Distinto a todos los anteriores. | — |
| `JWT_ADMIN_ACCESS_EXPIRES_IN` | Expiración del access token de admins. | `15m` |
| `JWT_ADMIN_REFRESH_EXPIRES_IN` | Expiración del refresh token de admins. | `1d` |
| `ADMIN_USERNAME_SEEDER` | Username del admin inicial creado por el seeder (solo en desarrollo). | `admin` |
| `ADMIN_PASSWORD_SEEDER` | Password del admin inicial (mínimo 8 caracteres). | — |
| `SWAGGER_USER` | Usuario para acceder a la documentación Swagger. | `admin` |
| `SWAGGER_PASSWORD` | Password para acceder a la documentación Swagger. | — |
| `MAIL_HOST` | Host SMTP para envío de emails. | `smtp.gmail.com` |
| `MAIL_PORT` | Puerto SMTP. | `587` |
| `MAIL_USER` | Usuario SMTP. | `tu_correo@gmail.com` |
| `MAIL_PASS` | Password SMTP (para Gmail, usar App Password). | — |
| `MAIL_FROM` | Dirección remitente de los emails. | `tu_correo@gmail.com` |

> **En producción** todos los secrets JWT, `CREDENTIAL_ENCRYPTION_KEY`, `TOTP_ENCRYPTION_KEY` y `ADMIN_PASSWORD_SEEDER` deben ser distintos a cualquier valor del `.env.example`. El servidor no arranca si detecta valores por defecto conocidos con `NODE_ENV=production`.

### Base de datos y migraciones

Las migraciones corren automáticamente al levantar el servidor (`migrationsRun: true`). No hace falta correrlas manualmente en desarrollo.

Para generar una nueva migración tras modificar entidades:

```bash
npm run migration:generate
```

Para correr migraciones manualmente:

```bash
npm run migration:run
```

### Seeder

En entorno `development`, al levantar el servidor se crea automáticamente el primer admin si no existe ninguno, usando las credenciales `ADMIN_USERNAME_SEEDER` / `ADMIN_PASSWORD_SEEDER` del `.env`.

En producción (`NODE_ENV=production`) el seeder está deshabilitado. El primer admin debe crearse manualmente vía CLI o directamente en la DB.

### Comandos

```bash
# Instalar dependencias
npm install

# Levantar en modo desarrollo (con hot reload)
npm run start:dev

# Build de producción
npm run build

# Levantar en modo producción
npm run start:prod

# Correr tests unitarios
npm run test

# Correr tests con cobertura
npm run test:cov

# Lint
npm run lint
```

### Documentación de la API

Con el servidor corriendo, la documentación Swagger está disponible en:

```
http://localhost:3000/docs
```

Requiere las credenciales `SWAGGER_USER` / `SWAGGER_PASSWORD` definidas en el `.env`.


## Panel de administración

Para gestionar el sistema sin usar la API directamente, existe un panel de administración web en el repositorio:

**[github.com/ignamosconi/sso-frvm-admin](https://github.com/ignamosconi/sso-frvm-admin)**

El panel permite:

- Iniciar sesión como administrador con autenticación de dos factores (TOTP).
- Resetear la autenticación de dos factores (2FA) proporcionando la password actual. Esto invalida el secret TOTP actual y obliga al administrador a configurar 2FA nuevamente en su próximo login.
- Crear y eliminar administradores del sistema.
- Registrar nuevas aplicaciones cliente, gestionar sus redirect URIs y ver su estado.
- Suspender y reactivar aplicaciones.
- Regenerar client secrets.
- Enviar las credenciales de acceso al desarrollador de la app por email, mediante un link de un solo uso que expira en 24 horas.
