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
    const r = await Proyecto.updateOne(
      { slug: datos.slug },
      { $setOnInsert: nuevo },
      { upsert: true },
    );
    if (r.upsertedCount > 0) resultado.proyectos.creados++;
    else resultado.proyectos.existentes++;

    const proyecto = await Proyecto.findOne({ slug: datos.slug }, { _id: 1 }).lean();
    if (proyecto && !(await Demo.exists({ proyecto: proyecto._id }))) {
      await Demo.create({ ...demoDesdePerfil(project), proyecto: proyecto._id, activa: true, orden: 0 });
      resultado.demos.creadas++;
    }
  }

  for (const [orden, service] of services.entries()) {
    const datos = servicioDesdePerfil(service);
    const nuevo = { ...datos, orden, publicado: true };
    await new Servicio(nuevo).validate();
    const r = await Servicio.updateOne(
      { titulo: datos.titulo },
      { $setOnInsert: nuevo },
      { upsert: true },
    );
    if (r.upsertedCount > 0) resultado.servicios.creados++;
    else resultado.servicios.existentes++;
  }

  return resultado;
}
