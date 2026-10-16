import { z } from "zod";
import { casoEsquema, proyectoEsquema, SLUG } from "./contenido-esquemas";

// Entrada del formulario de proyectos del panel (#51). Sin Mongoose: lo usan el servicio (`proyectos-admin.ts`),
// las server actions y el formulario (límites y slug sugerido).

export const LIMITES = {
  slug: 80,
  nombre: 80,
  categoria: 60,
  descripcion: 300,
  caso: 1500,
  item: 40,
  stackMin: 1,
  stackMax: 10,
  listaCaso: 20,
} as const;

const textoHasta = (max: number) => z.string().trim().min(1).max(max);

/**
 * Lo que acepta el panel. Extiende el esquema público (`proyectoEsquema`), así nada de lo que se guarda puede
 * descartarlo después la lectura (por ejemplo, un string vacío en el stack, que el modelo de Mongoose sí acepta
 * y haría desaparecer el proyecto del sitio). Suma los largos máximos del issue #51 y `publicado`.
 * `orden` no viene del formulario: lo maneja el servicio (al crear y al reordenar).
 */
export const proyectoEntradaEsquema = proyectoEsquema.extend({
  slug: z.string().trim().max(LIMITES.slug).regex(SLUG),
  nombre: textoHasta(LIMITES.nombre),
  categoria: textoHasta(LIMITES.categoria),
  descripcion: textoHasta(LIMITES.descripcion),
  stack: z.array(textoHasta(LIMITES.item)).min(LIMITES.stackMin).max(LIMITES.stackMax),
  caso: casoEsquema.extend({
    problema: textoHasta(LIMITES.caso),
    solucion: textoHasta(LIMITES.caso),
    funcionalidades: z.array(textoHasta(LIMITES.caso)).max(LIMITES.listaCaso),
    stack: z.array(textoHasta(LIMITES.item)).max(LIMITES.listaCaso),
  }),
  publicado: z.boolean(),
});
export type ProyectoEntrada = z.output<typeof proyectoEntradaEsquema>;

/** Un slug a partir del nombre: minúsculas, sin tildes ni ñ, guiones entre palabras, hasta 80 caracteres. */
export function sugerirSlug(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, LIMITES.slug)
    .replace(/^-+|-+$/g, "");
}

// Campos del formulario: `name` de cada input. Las listas van en un textarea, un ítem por línea.
const TEXTOS = ["slug", "nombre", "inicial", "categoria", "descripcion", "repoUrl", "acento", "imagen"] as const;
const CASO = ["caso.problema", "caso.solucion"] as const;
const LISTAS = ["stack", "caso.funcionalidades", "caso.stack"] as const;
const CAMPOS = [...TEXTOS, ...CASO, ...LISTAS] as const;
type Campo = (typeof CAMPOS)[number];

/** Lo que se mandó en el formulario, tal cual, para volver a mostrarlo si falló. */
export type ValoresFormulario = Record<Campo, string> & { publicado: boolean };

function texto(formData: FormData, nombre: string): string {
  const valor = formData.get(nombre);
  // El navegador manda los saltos de línea como CRLF, pero el `maxLength` del textarea los cuenta como uno.
  return typeof valor === "string" ? valor.replace(/\r\n?/g, "\n") : "";
}

function lineas(valor: string): string[] {
  return valor
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");
}

export function valoresDeFormulario(formData: FormData): ValoresFormulario {
  const valores = Object.fromEntries(CAMPOS.map((c) => [c, texto(formData, c)])) as Record<Campo, string>;
  return { ...valores, publicado: formData.get("publicado") === "on" };
}

/**
 * El objeto que recibe el servicio. No valida: las líneas vacías de las listas se ignoran (un salto de línea de
 * más no es un error), pero lo demás pasa tal cual y lo valida `proyectoEntradaEsquema`.
 */
export function datosDeFormulario(formData: FormData): Record<string, unknown> {
  const v = valoresDeFormulario(formData);
  return {
    slug: v.slug,
    nombre: v.nombre,
    inicial: v.inicial,
    categoria: v.categoria,
    descripcion: v.descripcion,
    repoUrl: v.repoUrl,
    acento: v.acento,
    imagen: v.imagen.trim() === "" ? undefined : v.imagen,
    stack: lineas(v.stack),
    caso: {
      problema: v["caso.problema"],
      solucion: v["caso.solucion"],
      funcionalidades: lineas(v["caso.funcionalidades"]),
      stack: lineas(v["caso.stack"]),
    },
    publicado: v.publicado,
  };
}

const MENSAJES: Record<string, string> = {
  slug: `Usá solo minúsculas, números y guiones, hasta ${LIMITES.slug} caracteres.`,
  nombre: `Escribí el nombre, hasta ${LIMITES.nombre} caracteres.`,
  inicial: "Una o dos letras.",
  categoria: `Escribí la categoría, hasta ${LIMITES.categoria} caracteres.`,
  descripcion: `Escribí la descripción, hasta ${LIMITES.descripcion} caracteres.`,
  stack: `Entre ${LIMITES.stackMin} y ${LIMITES.stackMax} tecnologías, una por línea, de hasta ${LIMITES.item} caracteres.`,
  repoUrl: "Tiene que ser una URL que empiece con https://.",
  acento: "Elegí uno de los colores.",
  imagen: "Tiene que ser una URL que empiece con https://.",
  caso: "Completá el caso de estudio.",
  "caso.problema": `Escribí el problema, hasta ${LIMITES.caso} caracteres.`,
  "caso.solucion": `Escribí la solución, hasta ${LIMITES.caso} caracteres.`,
  "caso.funcionalidades": `Hasta ${LIMITES.listaCaso} funcionalidades, una por línea, de hasta ${LIMITES.caso} caracteres.`,
  "caso.stack": `Hasta ${LIMITES.listaCaso} tecnologías, una por línea, de hasta ${LIMITES.item} caracteres.`,
  publicado: "Valor inválido.",
};

/** Un mensaje por campo (`stack`, `caso.problema`…), en castellano, a partir de los errores de Zod. */
export function erroresPorCampo(issues: readonly { path: readonly PropertyKey[] }[]): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const { path } of issues) {
    const [raiz = "", sub] = path.map(String);
    const campo = raiz === "caso" && sub !== undefined && `caso.${sub}` in MENSAJES ? `caso.${sub}` : raiz;
    campos[campo] ??= MENSAJES[campo] ?? "Revisá este campo.";
  }
  return campos;
}

/** Valores iniciales del formulario: vacío para uno nuevo (sin publicar) o los de un proyecto existente. */
export function valoresDeProyecto(p?: ProyectoEntrada): ValoresFormulario {
  return {
    slug: p?.slug ?? "",
    nombre: p?.nombre ?? "",
    inicial: p?.inicial ?? "",
    categoria: p?.categoria ?? "",
    descripcion: p?.descripcion ?? "",
    repoUrl: p?.repoUrl ?? "",
    acento: p?.acento ?? "primario",
    imagen: p?.imagen ?? "",
    stack: (p?.stack ?? []).join("\n"),
    "caso.problema": p?.caso.problema ?? "",
    "caso.solucion": p?.caso.solucion ?? "",
    "caso.funcionalidades": (p?.caso.funcionalidades ?? []).join("\n"),
    "caso.stack": (p?.caso.stack ?? []).join("\n"),
    publicado: p?.publicado ?? false,
  };
}
