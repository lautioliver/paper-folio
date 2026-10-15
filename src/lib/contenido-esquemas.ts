import { z } from "zod";
import { TONES } from "@/components/sitio/tones";
import { SERVICE_ICONS, type Project, type Service } from "@/content/profile";

// Formas públicas del contenido administrable (ADR-003) y su validación. Sin Mongoose ni next/cache:
// lo usan los modelos (validadores), los servicios de lectura (`contenido.ts`) y el seed.

function urlCon(protocolos: readonly string[], valor: string): boolean {
  if (!URL.canParse(valor)) return false;
  return protocolos.includes(new URL(valor).protocol);
}

/** URL absoluta `https:` (imágenes y repos). */
export function esUrlHttps(valor: string): boolean {
  return urlCon(["https:"], valor);
}

/** URL absoluta `http:` o `https:` (demos): nada de `javascript:` ni `data:` en un iframe o un enlace. */
export function esUrlHttp(valor: string): boolean {
  return urlCon(["http:", "https:"], valor);
}

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const texto = z.string().trim().min(1);
const urlHttps = z.string().trim().refine(esUrlHttps, { error: "debe ser una URL https" });
const urlHttp = z.string().trim().refine(esUrlHttp, { error: "debe ser una URL http o https" });
// En la base, un campo opcional puede faltar o venir en null: los dos son "sin valor".
const opcional = <T extends z.ZodType>(esquema: T) => esquema.nullish().transform((v) => v ?? undefined);

export const casoEsquema = z.object({
  problema: texto,
  solucion: texto,
  funcionalidades: z.array(texto),
  stack: z.array(texto),
});

export const proyectoEsquema = z.object({
  slug: z.string().regex(SLUG),
  nombre: texto,
  inicial: z.string().trim().min(1).max(2),
  categoria: texto,
  descripcion: texto,
  stack: z.array(texto),
  repoUrl: urlHttps,
  acento: z.enum(TONES),
  caso: casoEsquema,
  imagen: opcional(urlHttps),
});

export const demoEsquema = z.object({
  titulo: texto,
  url: urlHttp,
  descripcion: z.string().trim().default(""),
});

export const servicioEsquema = z.object({
  titulo: texto,
  descripcion: texto,
  icono: opcional(z.enum(SERVICE_ICONS)),
  imagen: opcional(urlHttps),
});

/** Proyecto tal como lo muestra el sitio. `tieneDemo`: si tiene al menos una demo activa. */
export type Proyecto = z.output<typeof proyectoEsquema> & { tieneDemo: boolean };
export type Demo = z.output<typeof demoEsquema>;
export type Servicio = z.output<typeof servicioEsquema>;

/** Un proyecto de `profile.ts` con la forma del modelo (respaldo y seed). */
export function proyectoDesdePerfil(project: Project): Proyecto {
  return { slug: project.slug } as Proyecto;
}

/** La demo de un proyecto de `profile.ts` (su `demoUrl`). */
export function demoDesdePerfil(project: Project): Demo {
  return { titulo: project.name } as Demo;
}

/** Un servicio de `profile.ts` con la forma del modelo. */
export function servicioDesdePerfil(service: Service): Servicio {
  return { titulo: service.title } as Servicio;
}
