# ADR-001 — Stack: Next.js fullstack con MongoDB

## Estado

Aceptado (2026-10-15)

Origen: [consigna del TPI](../consigna/instrucciones-tpi-2026.pdf) (Lenguajes 4, 2026) y decisión de @lautioliver en el chat.

## Contexto

Paperfolio es el Trabajo Práctico Integrador de Lenguajes 4: un portfolio de desarrollador fullstack con cuatro roles (visitante, usuario registrado, operador y administrador). El objetivo es **promocionar**, así que además de lo mínimo hay CRUD de contenido, gestión de usuarios, contadores de visitas y gráficos.

Lo que fija la consigna:
- Framework CSS obligatorio.
- Base SQL o NoSQL.
- Deploy en la nube o en localhost.
- Validación estricta de todos los campos, archivos e imágenes.
- Envío y respuesta de consultas por email.
- Registro obligatorio para ver el detalle de proyectos y demos.

Las exposiciones son del 26/10 al 13/11/2026. Hay poco tiempo, así que conviene un solo proyecto, un solo lenguaje y un deploy sin servidores propios.

## Decisión

1. **R-1. Un solo proyecto Next.js (App Router, TypeScript) hace de frontend y de backend.** La API vive en route handlers (`src/app/api/**`) y server actions. No hay un backend separado.
2. **R-2. MongoDB Atlas como base, con Mongoose.** Los modelos viven en `src/models/`. Hay pocos datos, y los documentos JSON viajan iguales entre la base, la API y la UI. Como Mongo no impone estructura, el schema vive en el código (ver R-6).
3. **R-3. Registro y login con Auth.js (Google).** Los roles (`usuario`, `operador`, `admin`) se guardan en la colección de usuarios y se controlan **en el servidor**, nunca solo en la UI.
4. **R-4. Emails con Resend.** Sirve para el aviso de consulta nueva y para la respuesta del operador. Cada respuesta queda registrada en la consulta.
5. **R-5. Tailwind CSS como framework CSS.** Los colores y las tipografías del manual de marca se definen como tokens del tema, sin valores sueltos.
6. **R-6. Validación con Zod en el servidor para toda entrada.** Abarca formularios, parámetros y archivos (tipo MIME y tamaño máximo). La validación del cliente es para la experiencia de uso y no reemplaza a la del servidor.
7. **R-7. Recharts para los gráficos del panel de admin y GSAP para las animaciones.** Las animaciones respetan `prefers-reduced-motion`.
8. **R-8. Deploy en Vercel.**

## Alternativas descartadas

- **PostgreSQL** — también sirve, pero suma migraciones y un ORM para pocas colecciones. Se prefiere Mongo por simpleza (decisión del equipo).
- **Express + React por separado** — son dos proyectos, dos deploys y CORS que configurar. Con el tiempo disponible no conviene.
- **Firebase** — resuelve auth y base, pero aleja el trabajo de la API y del modelado que evalúa la materia.
- **Bootstrap** — cumple el requisito de framework CSS, pero el diseño neo-brutalista es más simple de llevar con utilidades de Tailwind.

## Consecuencias

- Un solo `npm run dev` levanta todo, y el deploy es un push.
- Sin schema en la base, todo dato que entra pasa por Zod y por el modelo de Mongoose. Un endpoint sin validación es un bug.
- Los contadores de visitas se actualizan con `$inc` atómico. Los gráficos salen de agregaciones de Mongo.
- Se necesitan cuentas de MongoDB Atlas, Google Cloud (OAuth) y Resend. Sus claves van en `.env.local`, nunca en el repo.
- Falta el scaffold del proyecto: se hace en un issue aparte. Hasta entonces, las rutas de `docs/mapa-agentes.json` son opcionales (`?`).

## Enmienda 2026-10-15

El scaffold ya existe (#4). A cada ruta de `src/` en `docs/mapa-agentes.json` se le saca el `?` recién cuando el archivo existe (épica #3, decisión 5). Las reglas R-1 a R-8 no cambian.
