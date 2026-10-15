"use client";

import { useRef, useState, type FormEvent } from "react";
import { CONTACT_TYPES, CONTACT_TYPE_LABELS, parseContactRequest, type ContactField } from "@/lib/contact";
import { cn } from "@/lib/cn";

type Errors = Partial<Record<ContactField, string>>;

const FIELD = "w-full rounded-lg border-(length:--borde-marca) border-tinta bg-papel px-3 py-2.5 text-cuerpo";

/**
 * Formulario de contacto: valida con parseContactRequest (la misma regla del servidor) y envía a
 * POST /api/consultas. El campo `sitio_web` es una trampa para bots: oculto para personas.
 */
export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [serverError, setServerError] = useState("");
  // El estado se actualiza al renderizar: una ref frena un doble envío (doble clic o Enter repetido).
  const sending = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const formElement = event.currentTarget;
    const values = Object.fromEntries(new FormData(formElement));
    const result = parseContactRequest(values);
    setStatus("idle");
    setServerError("");
    if (!result.ok) return showErrors(formElement, result.errors);
    setErrors({});
    setStatus("sending");
    sending.current = true;
    try {
      const res = await fetch("/api/consultas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...result.data, sitio_web: values.sitio_web ?? "" }),
      });
      if (res.ok) {
        formElement.reset();
        setStatus("sent");
        return;
      }
      const body = await res.json().catch(() => null);
      setStatus("idle");
      const campos = body?.error?.campos;
      if (res.status === 400 && campos && Object.keys(campos).length > 0) return showErrors(formElement, campos);
      const mensaje = body?.error?.mensaje;
      setServerError(
        typeof mensaje === "string" && mensaje !== "" ? mensaje : "No pudimos enviar tu consulta. Probá de nuevo en un rato.",
      );
    } catch {
      setStatus("idle");
      setServerError("No pudimos conectar con el servidor. Revisá tu conexión y probá de nuevo.");
    } finally {
      sending.current = false;
    }
  }

  function showErrors(formElement: HTMLFormElement, next: Errors) {
    setErrors(next);
    const first = Object.keys(next)[0];
    formElement.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  const describedBy = (field: ContactField) => (errors[field] ? `${field}-error` : undefined);

  return (
    <form noValidate onSubmit={onSubmit} className="relative grid gap-5">
      <div aria-hidden="true" inert className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="sitio_web">No completes este campo</label>
        <input id="sitio_web" name="sitio_web" type="text" tabIndex={-1} autoComplete="off" />
      </div>
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
        <button
          type="submit"
          disabled={status === "sending"}
          className="apretable marca bg-tinta px-6 py-3 text-cuerpo font-bold text-papel disabled:opacity-60"
        >
          {status === "sending" ? "Enviando…" : "Enviar consulta"}
        </button>
        <p role="status" className="text-pequeno font-bold">
          {status === "sent" ? "¡Gracias! Te respondo por email." : ""}
        </p>
        <p role="alert" className="text-pequeno font-bold">
          {serverError ? (
            <>
              <span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-full bg-acento" />
              {serverError}
            </>
          ) : null}
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
