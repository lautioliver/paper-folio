import { projects, services } from "@/content/profile";
import { Demo } from "@/models/Demo";
import { Proyecto } from "@/models/Proyecto";
import { Servicio } from "@/models/Servicio";
import { demoDesdePerfil, proyectoDesdePerfil, servicioDesdePerfil } from "./contenido-esquemas";
import { asegurarIndicesDe, conectar } from "./db";

export type ResultadoSeed = {
  proyectos: { creados: number; existentes: number };
  demos: { creadas: number };
  servicios: { creados: number; existentes: number };
};

/**
 * Carga el contenido inicial de `profile.ts` (ADR-003). Idempotente y sin pisar lo editado en el panel:
 * - Proyectos por `slug` y servicios por `titulo`: solo se insertan los que faltan (`$setOnInsert`);
 *   los que ya están no se tocan, aunque el panel los haya cambiado o despublicado.
 * - Demos: la `demoUrl` de cada proyecto, solo si el proyecto no tiene ninguna demo (activa o no).
 * No es para correr en paralelo consigo mismo: dos corridas a la vez podrían duplicar una demo.
 */
// Sin `timestamps`: si no, Mongoose suma `$set: { actualizadoEn }` y tocaría cada documento existente.
// Las fechas van dentro de `$setOnInsert`, así solo se escriben al insertar.
const SIN_TOCAR = { upsert: true, timestamps: false } as const;

function insertado<T extends object>(datos: T): T & { creadoEn: Date; actualizadoEn: Date } {
  const ahora = new Date();
  return { ...datos, creadoEn: ahora, actualizadoEn: ahora };
}

export async function sembrarContenido(): Promise<ResultadoSeed> {
  await conectar();
  await Promise.all([asegurarIndicesDe(Proyecto), asegurarIndicesDe(Demo), asegurarIndicesDe(Servicio)]);
  const resultado: ResultadoSeed = {
    proyectos: { creados: 0, existentes: 0 },
    demos: { creadas: 0 },
    servicios: { creados: 0, existentes: 0 },
  };

  for (const [orden, project] of projects.entries()) {
    // `tieneDemo` es calculado: no se guarda.
    const { tieneDemo, ...datos } = proyectoDesdePerfil(project);
    void tieneDemo;
    const nuevo = { ...datos, orden, publicado: true };
    // Los validadores de Mongoose no corren sobre `$setOnInsert`: se valida antes.
    await new Proyecto(nuevo).validate();
    const r = await Proyecto.updateOne({ slug: datos.slug }, { $setOnInsert: insertado(nuevo) }, SIN_TOCAR);
    if (r.upsertedCount > 0) resultado.proyectos.creados++;
    else resultado.proyectos.existentes++;

    const id = r.upsertedId ?? (await Proyecto.findOne({ slug: datos.slug }, { _id: 1 }).lean())?._id;
    if (id && !(await Demo.exists({ proyecto: id }))) {
      await Demo.create({ ...demoDesdePerfil(project), proyecto: id, activa: true, orden: 0 });
      resultado.demos.creadas++;
    }
  }

  for (const [orden, service] of services.entries()) {
    const datos = servicioDesdePerfil(service);
    const nuevo = { ...datos, orden, publicado: true };
    await new Servicio(nuevo).validate();
    const r = await Servicio.updateOne({ titulo: datos.titulo }, { $setOnInsert: insertado(nuevo) }, SIN_TOCAR);
    if (r.upsertedCount > 0) resultado.servicios.creados++;
    else resultado.servicios.existentes++;
  }

  return resultado;
}

export type DestinoSeed = { host: string; base: string; esAtlas: boolean };

/**
 * A dónde va a escribir el seed, para mostrarlo antes de escribir: los hosts de la URI sin usuario ni
 * contraseña, la base y si es Atlas (algún host termina en `.mongodb.net`).
 */
export function destinoDelSeed(env: { MONGODB_URI: string; MONGODB_DB: string }): DestinoSeed {
  const sinEsquema = env.MONGODB_URI.replace(/^mongodb(\+srv)?:\/\//, "");
  const autoridad = sinEsquema.split(/[/?]/, 1)[0];
  const host = autoridad.slice(autoridad.lastIndexOf("@") + 1);
  const esAtlas = host.split(",").some((h) => h.split(":")[0].toLowerCase().endsWith(".mongodb.net"));
  return { host, base: env.MONGODB_DB, esAtlas };
}

