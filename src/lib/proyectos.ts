import { projects, type Project } from "@/content/profile";

export const RUTA_PROYECTOS = "/proyectos";

/** Ruta del detalle (protegido) de un proyecto. */
export function rutaDetalle(slug: string): string {
  return `${RUTA_PROYECTOS}/${slug}`;
}

/** Busca un proyecto por slug; `undefined` si no existe. */
export function buscarProyecto(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
