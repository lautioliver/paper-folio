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
  RESEND_API_KEY: z.string({ error: "falta" }).trim().startsWith("re_", { error: "debe empezar con re_" }),
  CONTACTO_EMAIL_DESTINO: z.string({ error: "falta" }).trim().pipe(z.email({ error: "debe ser un email" })),
});

// Auth.js (#32): las credenciales de Google y la clave de las sesiones, aparte para que `next build` y
// /api/salud no las exijan. Auth.js las lee solo de process.env; acá se validan con mensajes claros.
const esquemaAuth = z.object({
  AUTH_SECRET: z.string({ error: "falta" }).min(32, { error: "debe tener al menos 32 caracteres" }),
  AUTH_GOOGLE_ID: z.string({ error: "falta" }).trim().min(1, { error: "no puede estar vacía" }),
  AUTH_GOOGLE_SECRET: z.string({ error: "falta" }).trim().min(1, { error: "no puede estar vacía" }),
});

// Listas de emails separados por comas. Opcionales: vacías, nadie es admin ni operador.
const esquemaRoles = z.object({
  ADMIN_EMAILS: z.string().default(""),
  OPERADOR_EMAILS: z.string().default(""),
});

// Vercel Blob (#47): se autentica por OIDC (VERCEL_OIDC_TOKEN, que inyecta Vercel) con el id del store.
// Aparte para que `next build` y /api/salud no la exijan.
const esquemaBlob = z.object({
  BLOB_STORE_ID: z.string({ error: "falta" }),
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

/** Valida `AUTH_SECRET`, `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`. Mismas reglas que `leerEnv`. */
export function leerAuthConfig(fuente: Record<string, string | undefined> = process.env): z.infer<typeof esquemaAuth> {
  return validar(esquemaAuth, fuente);
}

/** Lee `ADMIN_EMAILS` y `OPERADOR_EMAILS` (vacías si no están) como listas de roles. */
export function leerAuthRoles(fuente: Record<string, string | undefined> = process.env): {
  admin: string;
  operador: string;
} {
  const { ADMIN_EMAILS, OPERADOR_EMAILS } = validar(esquemaRoles, fuente);
  return { admin: ADMIN_EMAILS, operador: OPERADOR_EMAILS };
}

/** Valida `BLOB_STORE_ID` (el store de Vercel Blob de las imágenes). Mismas reglas que `leerEnv`. */
export function leerBlobConfig(fuente: Record<string, string | undefined> = process.env): z.infer<typeof esquemaBlob> {
  return validar(esquemaBlob, fuente);
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
