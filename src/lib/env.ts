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

// IP_HASH_SAL va aparte: `leerEnv` (lo usan la base y /api/salud) no la exige.
const esquemaSal = z.object({
  IP_HASH_SAL: z.string({ error: "falta" }).min(16, { error: "debe tener al menos 16 caracteres" }),
});

// RESEND_API_KEY y CONTACTO_EMAIL_DESTINO van aparte por lo mismo.
const esquemaEmail = z.object({
  RESEND_API_KEY: z.string({ error: "falta" }).startsWith("re_", { error: "debe empezar con re_" }),
  CONTACTO_EMAIL_DESTINO: z.email({ error: "debe ser un email" }),
});

export type Env = z.infer<typeof esquema> & z.infer<typeof esquemaSal> & z.infer<typeof esquemaEmail>;

/**
 * Valida las variables del servidor. Si algo falla, el error nombra la variable
 * y el motivo, nunca el valor (puede traer credenciales).
 */
export function leerEnv(fuente: Record<string, string | undefined> = process.env): z.infer<typeof esquema> {
  return validar(esquema, fuente);
}

/** Valida solo `IP_HASH_SAL` (sal del hash de IP de las consultas) y la devuelve. Mismas reglas que `leerEnv`. */
export function leerIpHashSal(fuente: Record<string, string | undefined> = process.env): string {
  return validar(esquemaSal, fuente).IP_HASH_SAL;
}

/** Valida solo `RESEND_API_KEY` y `CONTACTO_EMAIL_DESTINO` (el aviso por email). Mismas reglas que `leerEnv`. */
export function leerEmailConfig(
  fuente: Record<string, string | undefined> = process.env,
): z.infer<typeof esquemaEmail> {
  return validar(esquemaEmail, fuente);
}

function validar<T extends z.ZodType>(schema: T, fuente: Record<string, string | undefined>): z.infer<T> {
  const resultado = schema.safeParse(fuente);
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
  get IP_HASH_SAL() {
    return leerIpHashSal();
  },
  get RESEND_API_KEY() {
    return leerEmailConfig().RESEND_API_KEY;
  },
  get CONTACTO_EMAIL_DESTINO() {
    return leerEmailConfig().CONTACTO_EMAIL_DESTINO;
  },
};
