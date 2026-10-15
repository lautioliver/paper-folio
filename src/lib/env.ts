import { z } from "zod";

const esquema = z.object({
  MONGODB_URI: z
    .string({ error: "falta" })
    .regex(/^mongodb(\+srv)?:\/\//, { error: "debe empezar con mongodb:// o mongodb+srv://" }),
  MONGODB_DB: z.string({ error: "falta" }).min(1, { error: "no puede estar vacía" }),
});

export class EnvInvalidoError extends Error {
  name = "EnvInvalidoError";
}

export type Env = z.infer<typeof esquema>;

/**
 * Valida las variables del servidor. Si algo falla, el error nombra la variable
 * y el motivo, nunca el valor (puede traer credenciales).
 */
export function leerEnv(fuente: Record<string, string | undefined> = process.env): Env {
  const resultado = esquema.safeParse(fuente);
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new EnvInvalidoError(`Variables de entorno inválidas: ${problemas}`);
  }
  return resultado.data;
}

/** Objeto tipado con las variables. Se valida en cada acceso, no al importar el módulo (así `next build` no exige `.env.local`). */
export const env: Env = {
  get MONGODB_URI() {
    return leerEnv().MONGODB_URI;
  },
  get MONGODB_DB() {
    return leerEnv().MONGODB_DB;
  },
};
