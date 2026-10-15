export const CONTACT_TYPES = ["general", "cotizacion", "asesoria"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export type ContactRequest = {
  name: string;
  email: string;
  type: ContactType;
  message: string;
};

export type ContactField = keyof ContactRequest;

export type ContactResult =
  | { ok: true; data: ContactRequest }
  | { ok: false; errors: Partial<Record<ContactField, string>> };

// Stub: el test se escribe antes que la validación.
export function parseContactRequest(input: unknown): ContactResult {
  return { ok: true, data: input as ContactRequest };
}
