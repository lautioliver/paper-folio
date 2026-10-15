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

## Variables de entorno

Van en `.env.local`, que no se commitea. Todavía no se usan: las agrega el #6 (MongoDB).

## Problemas conocidos

- `npm install` avisa que `unrs-resolver` tiene un script de instalación sin aprobar. ESLint funciona igual.
- Los worktrees de los agentes (`preparar.sh --worktree`) instalan con `npm ci --ignore-scripts`. Si una dependencia nueva necesita su `postinstall`, va a fallar solo ahí: hay que decidir cómo instalarla antes de sumarla.
- `next dev` agrega un bloque `nextjs-agent-rules` a `AGENTS.md` si no está. Ya está commiteado: no lo borres.
