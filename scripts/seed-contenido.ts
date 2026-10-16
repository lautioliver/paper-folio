// Carga el contenido inicial (proyectos, demos y servicios de src/content/profile.ts) en la base.
// Idempotente y sin pisar lo editado en el panel: ver `sembrarContenido` y docs/development/setup.md.
// Uso: npm run seed:contenido [-- --env-file <archivo>] [-- --atlas]
// Lee MONGODB_URI y MONGODB_DB del archivo (si se pasa, sus valores pisan los de la shell) o del entorno.
// Antes de escribir imprime el host y la base (nunca la URI ni credenciales). Se niega a escribir en
// Atlas (`*.mongodb.net`) sin `--atlas`: así una variable vieja de la shell no lleva el seed a producción.
import { readFileSync } from "node:fs";
import { parseArgs, parseEnv } from "node:util";
import { desconectar } from "../src/lib/db";
import { EnvInvalidoError, leerEnv } from "../src/lib/env";
import { destinoDelSeed, sembrarContenido } from "../src/lib/seed-contenido";

const { values } = parseArgs({ options: { "env-file": { type: "string" }, atlas: { type: "boolean", default: false } } });

class DestinoRechazado extends Error {
  name = "DestinoRechazado";
}

try {
  // `process.loadEnvFile` no pisa lo que ya está en el entorno: se lee el archivo y sus valores mandan.
  if (values["env-file"]) Object.assign(process.env, parseEnv(readFileSync(values["env-file"], "utf8")));
  const destino = destinoDelSeed(leerEnv());
  console.log(`Destino: host ${destino.host}, base "${destino.base}".`);
  if (destino.esAtlas && !values.atlas) {
    throw new DestinoRechazado(
      "el destino es MongoDB Atlas; si es la base que elegiste, volvé a correrlo con `-- --atlas`",
    );
  }
  console.log(`Cargando el contenido inicial en la base "${destino.base}"…`);
  const r = await sembrarContenido();
  console.log(`Proyectos: ${r.proyectos.creados} creados, ${r.proyectos.existentes} ya estaban (no se tocan).`);
  console.log(`Demos: ${r.demos.creadas} creadas (solo en proyectos sin ninguna demo).`);
  console.log(`Servicios: ${r.servicios.creados} creados, ${r.servicios.existentes} ya estaban (no se tocan).`);
} catch (error) {
  // De un error de conexión, solo el nombre: el mensaje del driver puede traer la URI.
  const detalle =
    error instanceof EnvInvalidoError || error instanceof DestinoRechazado
      ? error.message
      : error instanceof Error
        ? error.name
        : "error";
  console.error(`seed:contenido: no se pudo cargar el contenido (${detalle}).`);
  process.exitCode = 1;
} finally {
  await desconectar();
}
