"use client";

import { useRef, useState, type FocusEvent, type FormEvent } from "react";
import {
  CONTACT_TYPES,
  CONTACT_TYPE_LABELS,
  MESSAGE_MAX,
  NAME_MAX,
  parseContactRequest,
  validateContactField,
  type ContactField,
} from "@/lib/contact";

type Errors = Partial<Record<ContactField, string>>;

const FIELDS: ContactField[] = ["name", "email", "type", "message"];
const FIELD = "w-full rounded-lg border-(length:--borde-marca) border-tinta bg-papel px-3 py-2.5 text-cuerpo";

/**
 * Formulario de contacto: valida con parseContactRequest (la misma regla del servidor) y envía a
 * POST /api/consultas. Cada campo se valida al salir de él y, si ya tenía un error, mientras se escribe. El campo `sitio_web` es una trampa para bots: oculto para personas.
 */
export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [serverError, setServerError] = useState("");
  const [messageLength, setMessageLength] = useState(0);
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

  function validateField(target: EventTarget & { name?: string; value?: string }, onlyIfInvalid: boolean) {
    const field = FIELDS.find((name) => name === target.name);
    if (!field || (onlyIfInvalid && !errors[field])) return;
    const message = validateContactField(field, target.value ?? "");
    setErrors((current) => ({ ...current, [field]: message }));
  }

  const describedBy = (field: ContactField) => (errors[field] ? `${field}-error` : undefined);

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      onBlur={(event: FocusEvent<HTMLFormElement>) => validateField(event.target, false)}
      onChange={(event) => validateField(event.target, true)}
      onReset={() => setMessageLength(0)}
      className="relative grid gap-5"
    >
      <p className="text-pequeno">Los campos con * son obligatorios.</p>
      <div aria-hidden="true" inert className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="sitio_web">No completes este campo</label>
        <input id="sitio_web" name="sitio_web" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre" field="name" required error={errors.name}>
          <input id="name" name="name" required maxLength={NAME_MAX} autoComplete="name" className={FIELD} aria-invalid={!!errors.name} aria-describedby={describedBy("name")} />
        </Field>
        <Field label="Email" field="email" required error={errors.email}>
          <input id="email" name="email" type="email" required autoComplete="email" className={FIELD} aria-invalid={!!errors.email} aria-describedby={describedBy("email")} />
        </Field>
      </div>
      <Field label="Tipo de consulta" field="type" required error={errors.type}>
        <select id="type" name="type" required defaultValue="" className={FIELD} aria-invalid={!!errors.type} aria-describedby={describedBy("type")}>
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
      <Field label="Mensaje" field="message" required error={errors.message}>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          maxLength={MESSAGE_MAX}
          onInput={(event) => setMessageLength(event.currentTarget.value.length)}
          className={FIELD}
          aria-invalid={!!errors.message}
          aria-describedby={describedBy("message")}
        />
        <p className="text-pequeno">
          {messageLength} / {MESSAGE_MAX} caracteres
        </p>
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
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};

function Field({ label, field, required, error, children }: FieldProps) {
  // `content-start`: si el campo de al lado muestra un error y este no, la fila queda más alta y la grilla
  // estiraría el label y el input para llenarla. La línea del error siempre ocupa su lugar, así el
  // formulario no salta cuando aparece o se va un error mientras se escribe.
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={field} className="text-pequeno font-bold">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1">
            *
          </span>
        ) : null}
      </label>
      {children}
      <p id={`${field}-error`} className="min-h-5 text-pequeno font-bold">
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
