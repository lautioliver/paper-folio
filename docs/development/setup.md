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
| `ADMIN_EMAILS` y `OPERADOR_EMAILS` | Emails separados por comas que reciben el rol `admin` u `operador` en cada ingreso (ADR-002). Opcionales: vacías, todos son `usuario`. Nunca en el repo |
| `CONTACTO_EMAIL_DESTINO` | Email que recibe el aviso de cada consulta nueva. Con el remitente de pruebas `onboarding@resend.dev`, Resend solo entrega al email con el que se creó la cuenta. Va solo en `.env.local` y en las variables de Vercel, nunca en el repo |

`src/lib/env.ts` las valida con Zod cada vez que se leen (`IP_HASH_SAL`, `RESEND_API_KEY` y `CONTACTO_EMAIL_DESTINO` aparte, así la base y `/api/salud` no las exigen). Si falta una o tiene mal formato, el error nombra la variable y nunca su valor.

### Ingreso con Google

1. En [Google Cloud Console](https://console.cloud.google.com), crear un proyecto y configurar la **OAuth consent screen** como External, con tu email como usuario de prueba.
2. Ir a **Credentials → Create credentials → OAuth client ID → Web application**:
   - Orígenes: `http://localhost:3000` y `https://paper-folio.vercel.app`.
   - Redirecciones: `http://localhost:3000/api/auth/callback/google` y `https://paper-folio.vercel.app/api/auth/callback/google`.
3. Copiar el ID y el secreto a `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`, generar `AUTH_SECRET` y cargar `ADMIN_EMAILS`.
4. Probar con `npm run dev`: `curl localhost:3000/api/auth/providers` tiene que listar Google. En Vercel, Auth.js confía en el host solo; fuera de Vercel hay que poner `AUTH_TRUST_HOST=true`.

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
npm run seed:contenido -- --env-file .env.local    # toma MONGODB_URI y MONGODB_DB de ese archivo
MONGODB_URI=mongodb://localhost:27017 MONGODB_DB=paperfolio-dev npm run seed:contenido   # o del entorno
```

- Imprime el nombre de la base antes de escribir (nunca la URI): revisalo. Contra la base de producción lo corre una persona, no un agente.
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
