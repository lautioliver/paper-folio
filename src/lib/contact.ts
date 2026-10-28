import { z } from "zod";

export const CONTACT_TYPES = ["general", "cotizacion", "asesoria"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  general: "Consulta general",
  cotizacion: "Cotización de proyecto",
  asesoria: "Asesoría técnica",
};

export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const MESSAGE_MAX = 2000;

// Letras (con tildes y ñ), espacios, apóstrofo y guion, y al menos una letra.
const NAME_PATTERN = /^(?=.*\p{L})[\p{L}\p{M}' \u2019-]+$/u;

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribí tu nombre.")
    .min(NAME_MIN, "El nombre tiene que tener al menos 2 letras.")
    .max(NAME_MAX, "El nombre es demasiado largo.")
    .regex(NAME_PATTERN, "Usá solo letras, espacios, apóstrofos y guiones."),
  email: z.string().trim().min(1, "Escribí tu email.").pipe(z.email("Ese email no es válido.")),
  type: z.enum(CONTACT_TYPES, "Elegí un tipo de consulta."),
  message: z
    .string()
    .trim()
    .min(10, "Contame un poco más (mínimo 10 caracteres).")
    .max(MESSAGE_MAX, "El mensaje no puede pasar los 2000 caracteres."),
});

export type ContactRequest = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactRequest;

export type ContactResult =
  { ok: true; data: ContactRequest } | { ok: false; errors: Partial<Record<ContactField, string>> };

/** Valida una consulta del formulario: devuelve los datos limpios o un error por campo. */
export function parseContactRequest(input: unknown): ContactResult {
  const parsed = contactSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: Partial<Record<ContactField, string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as ContactField | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  if (Object.keys(errors).length === 0) errors.message = "La consulta no tiene el formato esperado.";
  return { ok: false, errors };
}

/** Valida un solo campo (para avisar en vivo). Devuelve el error o `undefined` si está bien. */
export function validateContactField(field: ContactField, value: string): string | undefined {
  const parsed = contactSchema.shape[field].safeParse(value);
  return parsed.success ? undefined : parsed.error.issues[0]?.message;
}
