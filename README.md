# SSO FRVM

Servidor de autenticación OAuth 2.0 para la UTN FRVM.

## ¿Qué es este proyecto?

SSO FRVM es un sistema de inicio de sesión único que permite a los alumnos autenticarse en aplicaciones de terceros usando sus credenciales de autogestión institucional, sin compartirlas con nadie más que la facultad.

La idea detrás del proyecto es incentivar a los alumnos a crear sus propias apps (torneos, foros, herramientas académicas, sistemas de reservas) que otros alumnos puedan usar, fomentando así la creación de un ecosistema digital propio de la FRVM. Cualquier desarrollador que quiera integrar el login institucional en su app puede hacerlo sin necesidad de manejar credenciales ni construir su propio sistema de autenticación.

**Este repositorio es público** para que cualquier persona pueda auditar que las credenciales de autogestión no son almacenadas en ningún lado y que el flujo de autenticación funciona exactamente como se documenta aquí. 

**La seguridad del sistema no depende del secreto del código, sino de que el servidor corre en el dominio oficial de la facultad y de que los secrets de producción viven únicamente en el servidor, nunca en el repositorio.**


## Tecnologías

- **NestJS** - framework de backend
- **TypeORM** - ORM para PostgreSQL
- **PostgreSQL** - base de datos (dockerizada)
- **JWT** - tokens de acceso y refresco
- **Nodemailer** - envío de credenciales por email
- **Swagger** - documentación interactiva de la API
- **Docker Compose** - gestión de la base de datos

## ¿Cómo integro mi app con el SSO?

Si sos alumno o desarrollador y querés que tu app permita iniciar sesión con las credenciales de autogestión de la FRVM, estos son los pasos que tenés que seguir. 

Vas a usar el despliegue de la facultad: no tenés que levantar este repositorio.

### 1. Registrar tu app

Contactate con el área de sistemas de la FRVM para que un administrador registre tu app en el sistema. Vas a necesitar darle:

- **Nombre de tu app**
- **Redirect URI**: la URL de tu app a la que el SSO redirigirá tras el login. Podés registrar varias (por ejemplo, una de desarrollo -https://ejemplo.com.ar/callback- y una de producción -http://localhost:4000/callback-).

El administrador te va a enviar por email:
- Tu `client_id` (número)
- Tu `client_secret` (string de 256 bits)

### 2. Flujo de autenticación

El flujo completo es el siguiente:

```
Tu app                          SSO FRVM                    Autogestión UTN
  │                                │                               │
  │  1. Abre popup de login        │                               │
  │ ──────────────────────────────►│                               │
  │                                │                               │
  │  2. Usuario ingresa            │                               │
  │     legajo + contraseña        │                               │
  │ ──────────────────────────────►│                               |
  |                                |  3. Valida credenciales       │
  │                                │ ─────────────────────────────►│
  │                                │ ◄─────────────────────────────│
  │                                │                               │
  │  4. SSO envía "code"           │                               │
  │     via postMessage            │                               │
  │ ◄──────────────────────────────│                               │
  │                                │                               │
  │  5. Tu backend canjea          │                               │
  │     "code" por "tokens"        │                               │
  │ ──────────────────────────────►│                               │
  │ ◄──────────────────────────────│                               │
  │                                │                               │
  │  6. Usás el access token       │                               │
  │     para identificar           │                               │
  │     al usuario o el refresh    |                               | 
  |     token para renovar el      |                               |
  |     access. Si se vence el     |                               |
  |     refresh, tenés que pedir   |                               |
  |     otro code (vuelta a paso 1)|                               |
```

### 3. Implementación paso a paso

**Paso 1 - Abrí el popup de login**

```javascript
const state = crypto.randomUUID(); // guardalo en sesión para verificarlo después. Evita ataques CSRF.
sessionStorage.setItem('sso_state', state);

window.open(
  `https://sso.frvm.utn.edu.ar/sso/login?client_id=TU_CLIENT_ID&redirect_uri=TU_REDIRECT_URI&state=${state}`,
  'sso-login',
  'width=500,height=375'      //Dimensiones recomendadas
);
```

**Paso 2 - Escuchá el postMessage**

```javascript
window.addEventListener('message', async (event) => {
  if (event.origin !== 'https://sso.frvm.utn.edu.ar') return;

  const { code, state } = event.data;

  // Verificá que el state coincida con el que generaste
  if (state !== sessionStorage.getItem('sso_state')) return;

  // Mandá el code a tu backend para canjearlo
  await fetch('/auth/callback', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
});
```

**Paso 3 - Tu backend canjea el code por tokens**

Este paso debe hacerse desde tu backend, nunca desde el frontend, porque usa el `client_secret`.

```http
POST https://sso.frvm.utn.edu.ar/sso/token
Content-Type: application/json

{
  "client_id": "TU_CLIENT_ID",
  "client_secret": "TU_CLIENT_SECRET",
  "code": "EL_CODE_RECIBIDO",
  "redirect_uri": "TU_REDIRECT_URI"
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

**Paso 4 - Identificá al usuario**

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
  "email": "alumno@frvm.utn.edu.ar",
  "grupo": "Alumno"
}
```

**Paso 5 - Renovar el access token**

El `access_token` expira. Cuando eso ocurra, usá el `refresh_token` para obtener uno nuevo sin pedirle al usuario que vuelva a loguearse.

```http
POST https://sso.frvm.utn.edu.ar/sso/refresh
Content-Type: application/json

{
  "refresh_token": "TU_REFRESH_TOKEN"
}
```

### 4. Notas de seguridad

- El `client_secret` debe vivir únicamente en tu backend. Nunca lo expongas en el frontend.
- El `code` es de un solo uso y expira en 2 minutos.
- Siempre verificá que el `state` del `postMessage` coincida con el que generaste.
- Siempre verificá que el `event.origin` del `postMessage` sea el dominio oficial del SSO.
- Si perdés el `client_secret`, pedile al administrador que lo regenere desde el panel.



## Levantar el proyecto

### Requisitos previos

- Node.js
- Docker y Docker Compose

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/ignamosconi/sso-frvm.git
cd sso-frvm

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editá .env y completá los valores (ver sección siguiente)

# 4. Levantar la base de datos
docker compose up -d

# 5. Levantar el servidor en desarrollo
npm run start:dev

# O en producción
npm run build
npm run start:prod
```

### Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `AUTH_ROUTE_PATH` | Prefijo de rutas SSO | `sso` |
| `AUTOGESTION_BASE_URL` | URL del webservice de autogestión UTN | `https://webservice.frvm.utn.edu.ar/autogestion` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_USERNAME` | Usuario de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `postgres` |
| `DB_NAME` | Nombre de la base de datos | `sso_frvm` |
| `JWT_ACCESS_SECRET` | Secret para firmar access tokens de alumnos | *(string aleatorio largo y único,)* |
| `JWT_REFRESH_SECRET` | Secret para firmar refresh tokens de alumnos | *(string aleatorio largo y único)* |
| `JWT_ACCESS_EXPIRES_IN` | Duración del access token de alumnos | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Duración del refresh token de alumnos | `7d` |
| `JWT_ADMIN_ACCESS_SECRET` | Secret para firmar access tokens de admins | *(string aleatorio largo y único)* |
| `JWT_ADMIN_REFRESH_SECRET` | Secret para firmar refresh tokens de admins | *(string aleatorio largo y único)* |
| `JWT_ADMIN_ACCESS_EXPIRES_IN` | Duración del access token de admins | `15m` |
| `JWT_ADMIN_REFRESH_EXPIRES_IN` | Duración del refresh token de admins | `7d` |
| `CODE_TTL_MS` | Duración del authorization code en milisegundos | `120000` |
| `ADMIN_USERNAME_SEEDER` | Usuario del primer administrador | `admin` |
| `ADMIN_PASSWORD_SEEDER` | Contraseña del primer administrador | *(elegí una segura)* |
| `SWAGGER_USER` | Usuario para acceder a la documentación | `admin` |
| `SWAGGER_PASSWORD` | Contraseña para acceder a la documentación | *(elegí una segura)* |
| `ADMIN_PANEL_URL` | URL del panel de administración (CORS) | `http://localhost:5173` |
| `MAIL_HOST` | Host SMTP para envío de emails | `smtp.gmail.com` |
| `MAIL_PORT` | Puerto SMTP | `587` |
| `MAIL_USER` | Usuario SMTP | `tu.correo@gmail.com` |
| `MAIL_PASS` | Contraseña SMTP (app password) | *(generá una en tu cuenta)* |
| `MAIL_FROM` | Dirección de origen de los emails | `tu.correo@gmail.com` |
| `SSO_BASE_URL` | URL pública del SSO (se incluye en emails) | *(completar según despliegue)* |

### Seeder de administrador

Al arrancar el servidor por primera vez, se ejecuta automáticamente un seeder que crea el primer administrador del sistema con las credenciales definidas en `ADMIN_USERNAME_SEEDER` y `ADMIN_PASSWORD_SEEDER`. Si el usuario ya existe, el seeder no hace nada. Este comportamiento es intencional para que el primer deploy funcione sin intervención manual y para que reinicios posteriores no dupliquen el admin.

### Migraciones

Las migraciones se corren automáticamente al arrancar el servidor. Para generar una nueva migración tras modificar una entidad:

```bash
npm run build
npx typeorm migration:generate src/database/migrations/nombre-descriptivo -d dist/database/datasource.js
npm run build
npm run start:prod
```

### Documentación de la API

La documentación interactiva de todos los endpoints está disponible en `/docs` una vez que el servidor está corriendo. Requiere las credenciales definidas en `SWAGGER_USER` y `SWAGGER_PASSWORD`.



## Panel de administración

Para gestionar administradores y clientes OAuth registrados se diseñó un panel de administración con interfaz gráfica, disponible en:

[github.com/ignamosconi/sso-frvm-admin](https://github.com/ignamosconi/sso-frvm-admin)

El panel permite crear y eliminar administradores, registrar nuevas apps cliente, gestionar sus redirect URIs, regenerar secrets y enviar las credenciales por email al desarrollador.
