// Carga el contenido inicial (proyectos, demos y servicios de src/content/profile.ts) en la base.
// Idempotente y sin pisar lo editado en el panel: ver `sembrarContenido` y docs/development/setup.md.
// Uso: npm run seed:contenido [-- --env-file <archivo>]
// Lee MONGODB_URI y MONGODB_DB del entorno (o del archivo). Nunca imprime la URI.
import { parseArgs } from "node:util";
import { desconectar } from "../src/lib/db";
import { EnvInvalidoError, leerEnv } from "../src/lib/env";
import { sembrarContenido } from "../src/lib/seed-contenido";

const { values } = parseArgs({ options: { "env-file": { type: "string" } } });

try {
  if (values["env-file"]) process.loadEnvFile(values["env-file"]);
  const { MONGODB_DB } = leerEnv();
  console.log(`Cargando el contenido inicial en la base "${MONGODB_DB}"…`);
  const r = await sembrarContenido();
  console.log(`Proyectos: ${r.proyectos.creados} creados, ${r.proyectos.existentes} ya estaban (no se tocan).`);
  console.log(`Demos: ${r.demos.creadas} creadas (solo en proyectos sin ninguna demo).`);
  console.log(`Servicios: ${r.servicios.creados} creados, ${r.servicios.existentes} ya estaban (no se tocan).`);
} catch (error) {
  // De un error de conexión, solo el nombre: el mensaje del driver puede traer la URI.
  const detalle = error instanceof EnvInvalidoError ? error.message : error instanceof Error ? error.name : "error";
  console.error(`seed:contenido: no se pudo cargar el contenido (${detalle}).`);
  process.exitCode = 1;
} finally {
  await desconectar();
}
