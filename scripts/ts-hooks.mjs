// Deja correr con Node los scripts en TypeScript del repo (`npm run seed:contenido`) sin dependencias nuevas.
// Node ya quita los tipos solo (type stripping); esto resuelve lo que hace el bundler en la app:
// el alias `@/` (tsconfig `paths`) y los imports sin extensión (`./db` → `./db.ts`).
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";

const SRC = new URL("../src/", import.meta.url);
const CON_EXTENSION = /\.(?:[cm]?[jt]sx?|json)$/;

function conExtension(url) {
  if (CON_EXTENSION.test(url.pathname)) return url;
  for (const sufijo of [".ts", "/index.ts"]) {
    const candidata = new URL(url.href + sufijo);
    if (existsSync(candidata)) return candidata;
  }
  return url;
}

registerHooks({
  resolve(especificador, contexto, siguiente) {
    const padre = contexto.parentURL;
    const delRepo = padre?.startsWith("file:") && !padre.includes("/node_modules/");
    if (delRepo && especificador.startsWith("@/")) {
      return siguiente(conExtension(new URL(especificador.slice(2), SRC)).href, contexto);
    }
    if (delRepo && (especificador.startsWith("./") || especificador.startsWith("../"))) {
      return siguiente(conExtension(new URL(especificador, padre)).href, contexto);
    }
    return siguiente(especificador, contexto);
  },
});
