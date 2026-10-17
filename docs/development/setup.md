# Setup — Paperfolio

> Cómo levantar el proyecto en local: variables de entorno, servicios, troubleshooting.

## Requisitos

- **Node 24** (`.nvmrc`; `engines` fija `24.x`, así Vercel no salta solo a otra versión mayor). Con nvm: `nvm use`.
- npm (viene con Node).

## Levantar

```bash
npm install
npm run dev          # http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` (genera los tipos de rutas, como `LayoutProps`) + `tsc --noEmit` |
| `npm test` | Vitest, una pasada |
| `npm run build` | Build de producción |
| `npm run seed:contenido` | Carga los proyectos, demos y servicios iniciales en la base (ver [Cargar el contenido](#cargar-el-contenido)) |

## CI

`.github/workflows/ci.yml` corre en cada PR y en cada push a `main`: `npm ci`, `npm run lint`, `npm run typecheck` y `npm test`, con Node tomado de `.nvmrc`. Fija la carpeta del binario de `mongod` con `MONGOMS_DOWNLOAD_DIR` (en `runner.temp`) y la cachea entre corridas (`actions/cache`, clave por imagen del runner y versión de `mongodb-memory-server-core`; se guarda aunque el job falle, pero solo si el binario pasa su `.md5`), así los tests no vuelven a descargar `mongod`. Antes de abrir un PR, correr en local lint, typecheck y tests (`npm run lint`, `npm run typecheck`, `npm test`). No usa secretos.

## Variables de entorno

Van en `.env.local`, que no se commitea. Se copia de la plantilla: `cp .env.example .env.local`.

| Variable | Qué es |
|---|---|
| `MONGODB_URI` | Cadena de conexión de Atlas (`mongodb+srv://…`; también vale `mongodb://`). Obligatoria |
| `MONGODB_DB` | Nombre de la base: `paperfolio-dev` en desarrollo, `paperfolio` en producción. Obligatoria |
| `IP_HASH_SAL` | Sal del hash SHA-256 de la IP de las consultas de contacto (mínimo 16 caracteres; `openssl rand -hex 32`). Obligatoria para guardar consultas; `/api/salud` no la pide |
| `RESEND_API_KEY` | Clave de la API de Resend (empieza con `re_`). Se saca en [resend.com/api-keys](https://resend.com/api-keys) (Create API Key, permiso de envío). Obligatoria para mandar el aviso de cada consulta; sin ella la consulta se guarda igual con `emailEnviado: false` |
| `AUTH_SECRET` | Clave de las sesiones de Auth.js, de al menos 32 caracteres (`openssl rand -base64 32`). Una distinta por entorno |
| `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` | Cliente OAuth de Google (ver "Ingreso con Google"). Obligatorias para iniciar sesión; sin ellas la landing funciona y `/api/auth/*` responde 500 con las variables que faltan en el log |
| `ADMIN_EMAILS` | Emails separados por comas que son `admin` siempre: el panel no los degrada ni los bloquea, y sacar uno de la lista le quita el admin al instante (ADR-002, enmienda de #49). Los demás roles se asignan en `/panel/usuarios`. Opcional, pero sin ella el primer admin habría que crearlo a mano en la base. Nunca en el repo. `OPERADOR_EMAILS` ya no se usa: si quedó en Vercel, se puede borrar |
| `CONTACTO_EMAIL_DESTINO` | Email que recibe el aviso de cada consulta nueva. Con el remitente de pruebas `onboarding@resend.dev`, Resend solo entrega al email con el que se creó la cuenta. Va solo en `.env.local` y en las variables de Vercel, nunca en el repo |
| `GMAIL_USER` y `GMAIL_APP_PASSWORD` | Cuenta de Gmail que responde las consultas desde el panel y una contraseña de aplicación de esa cuenta (16 caracteres; ver "Respuestas por Gmail"). Obligatorias para responder; sin ellas el panel funciona y responder muestra el error `configuracion`, sin enviar ni registrar nada. Nunca en el repo |
| `BLOB_STORE_ID` | Id del store de Vercel Blob de las imágenes (empieza con `store_`; ver "Imágenes en Vercel Blob"). Obligatoria para subir imágenes; la base y `/api/salud` no la piden |

`src/lib/env.ts` las valida con Zod cada vez que se leen (`IP_HASH_SAL`, `RESEND_API_KEY` y `CONTACTO_EMAIL_DESTINO`, `GMAIL_USER` y `GMAIL_APP_PASSWORD` aparte, así la base y `/api/salud` no las exigen). Si falta una o tiene mal formato, el error nombra la variable y nunca su valor.

### Ingreso con Google

1. En [Google Cloud Console](https://console.cloud.google.com), crear un proyecto y configurar la **OAuth consent screen** como External, con tu email como usuario de prueba.
2. Ir a **Credentials → Create credentials → OAuth client ID → Web application**:
   - Orígenes: `http://localhost:3000` y `https://paper-folio.vercel.app`.
   - Redirecciones: `http://localhost:3000/api/auth/callback/google` y `https://paper-folio.vercel.app/api/auth/callback/google`.
3. Copiar el ID y el secreto a `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`, generar `AUTH_SECRET` y cargar `ADMIN_EMAILS`.
4. Probar con `npm run dev`: `curl localhost:3000/api/auth/providers` tiene que listar Google. En Vercel, Auth.js confía en el host solo; fuera de Vercel hay que poner `AUTH_TRUST_HOST=true`.

### Imágenes en Vercel Blob

1. En Vercel, en el proyecto: **Storage → Create → Blob**, y conectarlo al proyecto. Vercel carga `BLOB_STORE_ID` en sus variables (si el store se conectó con otro prefijo, aparecen otras como `BLOB_STORE_ID_STORE_ID`, que el código no usa).
2. La autenticación es por **OIDC**: en Vercel, `VERCEL_OIDC_TOKEN` lo inyecta la plataforma; no hace falta `BLOB_READ_WRITE_TOKEN`.
3. En local hacen falta `BLOB_STORE_ID` y `VERCEL_OIDC_TOKEN` en `.env.local`. El token vence a las ~12 h: para renovarlo, **no** corras `vercel env pull` sobre `.env.local` (lo pisa entero); bajalo a un archivo aparte (`vercel env pull .env.oidc`) y copiá solo esa variable. Si la subida responde `503 SUBIDA_FALLIDA` en local, lo primero es renovarlo.
4. Los tests no las necesitan: el cliente de Blob se inyecta y `vitest.config.ts` las vacía.

### Respuestas por Gmail

El operador responde las consultas por SMTP de Gmail, desde la cuenta de la persona (épica #36, decisión 4). Resend sigue solo para los avisos internos.

1. En la cuenta de Google que va a enviar, activar la **verificación en dos pasos** (sin ella Google no ofrece contraseñas de aplicación).
2. Ir a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), crear una contraseña de aplicación ("Paperfolio") y copiarla. Google la muestra en cuatro grupos: los espacios no cuentan.
3. Cargar `GMAIL_USER` (el email de esa cuenta) y `GMAIL_APP_PASSWORD` en `.env.local` y en las variables de Vercel. Nunca la contraseña normal de la cuenta.
4. Gmail permite unos 500 envíos por día. Si un envío falla, el panel muestra el código del error (por ejemplo `EAUTH` si la contraseña es incorrecta) y la respuesta queda en el seguimiento como "no se pudo confirmar el envío". Si falta una variable, el código es `configuracion` y no se registra nada. Si Gmail no confirma en 10 s (`timeout`), el email puede haber llegado: la respuesta queda sin confirmar y no se puede volver a responder esa consulta hasta 2 minutos después del intento. Revisá Enviados en Gmail antes de volver a responder.
5. Los tests no las necesitan: el transporte se inyecta y `vitest.config.ts` las vacía.
6. `nodemailer` está instalado con el alias `nodemailer-10` (`"nodemailer-10": "npm:nodemailer@^10.1.1"` en `package.json`) y se importa con ese nombre. `@auth/core`, que viene con `next-auth` 5 beta, declara `nodemailer` como peer opcional `^7 || ^8`. Con la 10 instalada como `nodemailer`, npm anida `@auth/core` dentro de `next-auth` y la augmentación de `@auth/core/jwt` (`src/types/next-auth.d.ts`) deja de aplicar: el typecheck de `src/auth.ts` falla. Con el alias no hay `nodemailer` en el primer nivel, así que `@auth/core` queda arriba. La 10 trae sus propios tipos (`dist/*/nodemailer.d.ts`), que TypeScript resolvió con el alias sin necesidad de un shim; por eso no se instala `@types/nodemailer` (se quitó en #66, aprobado por @lautioliver en https://github.com/lautioliver/paper-folio/issues/66#issuecomment-6227686445). Aprobado por @lautioliver en https://github.com/lautioliver/paper-folio/issues/40#issuecomment-6221640394. Cuando `next-auth` acepte la 10 en ese peer, se puede volver a `nodemailer` a secas.

### Crear el cluster de Atlas

1. En [MongoDB Atlas](https://cloud.mongodb.com), crear un proyecto y un cluster gratuito (M0).
2. En **Database Access**, crear un usuario con contraseña y permisos de lectura y escritura.
3. En **Network Access**, permitir tu IP. Para Vercel, que no tiene IP fija, hace falta `0.0.0.0/0`.
4. En **Connect > Drivers**, copiar la cadena de conexión, reemplazar `<password>` y pegarla en `MONGODB_URI` de `.env.local`.
5. Con `npm run dev`, `curl localhost:3000/api/salud` tiene que responder `200 {"ok":true}`. Si responde `503`, la URI o el acceso de red están mal.

No corras scripts de seed ni de borrado contra la base compartida: usá `paperfolio-dev` o una base propia.

## Cargar el contenido

Los proyectos, sus demos y los servicios viven en la base (ADR-003). Mientras la base no los tenga, el sitio muestra los de `src/content/profile.ts`, así que no hace falta correr nada para desarrollar. Para cargarlos (una vez por base):

```bash
npm run seed:contenido -- --env-file .env.seed      # MONGODB_URI y MONGODB_DB de ese archivo
MONGODB_URI=mongodb://localhost:27017 MONGODB_DB=paperfolio-dev npm run seed:contenido   # o del entorno
npm run seed:contenido -- --env-file .env.local --atlas   # solo si el destino es Atlas a propósito
```

- Con `--env-file`, los valores del archivo pisan los que tenga exportados la shell: el seed escribe en la base del archivo. Sin `--env-file`, usa las variables del entorno.
- Antes de escribir imprime el host y la base de destino (nunca la URI ni las credenciales): revisalos.
- Si el host es de Atlas (`*.mongodb.net`), se niega a escribir y no se conecta, salvo que se pase `--atlas`. Contra la base de producción lo corre una persona, nunca un agente.
- Es idempotente: inserta los proyectos (por `slug`) y servicios (por `titulo`) que faltan, publicados y en el orden de `profile.ts`, y no toca los que ya están, aunque se hayan editado o despublicado en el panel. La demo de cada proyecto (su `demoUrl`) se carga solo si el proyecto no tiene ninguna.
- Si en el panel se renombra un slug o un título, o se borran todas las demos de un proyecto, correrlo de nuevo vuelve a cargar el original.
- No lo corras dos veces a la vez (podría duplicar una demo).
- El sitio lo muestra en hasta un minuto (el respaldo estático se cachea con `cacheLife("minutes")`).
- Rollback: borrar las colecciones `proyectos`, `demos` y `servicios`; el sitio vuelve al contenido estático.

## Tests con MongoDB

Los tests de la base usan `mongodb-memory-server`: levantan un `mongod` efímero en memoria, así que no necesitan Atlas ni `.env.local`. El binario de MongoDB se descarga **la primera vez que corre un test** y queda en `~/.cache/mongodb-binaries` (si npm no corre el `postinstall` de `mongodb-memory-server`: npm 11 bloquea los scripts de instalación no aprobados, y los worktrees instalan con `--ignore-scripts`). Esa primera corrida necesita red y tarda; las siguientes son offline. Para usar un `mongod` ya instalado, `MONGOMS_SYSTEM_BINARY=/ruta/a/mongod npm test`.

## Problemas conocidos

- `npm install` avisa que `unrs-resolver` tiene un script de instalación sin aprobar. ESLint funciona igual.
- Los worktrees de los agentes (`preparar.sh --worktree`) instalan con `npm ci --ignore-scripts`. Si una dependencia nueva necesita su `postinstall`, va a fallar solo ahí: hay que decidir cómo instalarla antes de sumarla.
- `next dev` agrega un bloque `nextjs-agent-rules` a `AGENTS.md` si no está. Ya está commiteado: no lo borres.
