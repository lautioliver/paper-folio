"use client";

import { useState, type FormEvent } from "react";
import { CONTACT_TYPES, CONTACT_TYPE_LABELS, parseContactRequest, type ContactField } from "@/lib/contact";
import { cn } from "@/lib/cn";

type Errors = Partial<Record<ContactField, string>>;

const FIELD = "w-full rounded-lg border-(length:--borde-marca) border-tinta bg-papel px-3 py-2.5 text-cuerpo";

/**
 * Formulario de contacto del PoC (#18): valida con parseContactRequest (la misma regla que usará el
 * servidor) pero todavía no envía. El email al operador llega con el hito 2.
 */
export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = parseContactRequest(Object.fromEntries(form));
    if (!result.ok) {
      setErrors(result.errors);
      setSent(false);
      const first = Object.keys(result.errors)[0];
      event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    setSent(true);
    event.currentTarget.reset();
  }

  const describedBy = (field: ContactField) => (errors[field] ? `${field}-error` : undefined);

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5" aria-describedby="contacto-poc">
      <p id="contacto-poc" className="rounded-lg bg-superficie px-3 py-2 text-pequeno">
        Versión de prueba: valida la consulta pero todavía no envía el email.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre" field="name" error={errors.name}>
          <input id="name" name="name" autoComplete="name" className={FIELD} aria-invalid={!!errors.name} aria-describedby={describedBy("name")} />
        </Field>
        <Field label="Email" field="email" error={errors.email}>
          <input id="email" name="email" type="email" autoComplete="email" className={FIELD} aria-invalid={!!errors.email} aria-describedby={describedBy("email")} />
        </Field>
      </div>
      <Field label="Tipo de consulta" field="type" error={errors.type}>
        <select id="type" name="type" defaultValue="" className={FIELD} aria-invalid={!!errors.type} aria-describedby={describedBy("type")}>
          <option value="" disabled>
            Elegí una opción
          </option>
          {CONTACT_TYPES.map((type) => (
            <option key={type} value={type}>
              {CONTACT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Mensaje" field="message" error={errors.message}>
        <textarea id="message" name="message" rows={5} className={FIELD} aria-invalid={!!errors.message} aria-describedby={describedBy("message")} />
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="apretable marca bg-tinta px-6 py-3 text-cuerpo font-bold text-papel">
          Enviar consulta
        </button>
        <p role="status" className="text-pequeno font-bold">
          {sent ? "¡Consulta válida! En esta versión de prueba no se envía." : ""}
        </p>
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  field: ContactField;
  error?: string;
  children: React.ReactNode;
};

function Field({ label, field, error, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={field} className="text-pequeno font-bold">
        {label}
      </label>
      {children}
      <p id={`${field}-error`} className={cn("min-h-5 text-pequeno font-bold", error ? "text-tinta" : "sr-only")}>
        {error ? (
          <>
            <span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-full bg-acento" />
            {error}
          </>
        ) : null}
      </p>
    </div>
  );
}
