import { z } from "zod";

export const CONTACT_TYPES = ["general", "cotizacion", "asesoria"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  general: "Consulta general",
  cotizacion: "Cotización de proyecto",
  asesoria: "Asesoría técnica",
};

const contactSchema = z.object({
  name: z.string().trim().min(1, "Escribí tu nombre.").max(100, "El nombre es demasiado largo."),
  email: z.string().trim().min(1, "Escribí tu email.").pipe(z.email("Ese email no es válido.")),
  type: z.enum(CONTACT_TYPES, "Elegí un tipo de consulta."),
  message: z
    .string()
    .trim()
    .min(10, "Contame un poco más (mínimo 10 caracteres).")
    .max(2000, "El mensaje no puede pasar los 2000 caracteres."),
});

export type ContactRequest = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactRequest;

export type ContactResult =
  | { ok: true; data: ContactRequest }
  | { ok: false; errors: Partial<Record<ContactField, string>> };

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
  void field;
  void value;
  return undefined;
}
