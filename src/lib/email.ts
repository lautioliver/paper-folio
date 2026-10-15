import { Resend } from "resend";
import type { ConsultaCreada } from "./consultas";
import { leerEmailConfig } from "./env";

/** Lo mínimo del cliente de Resend que usamos: se inyecta para testear sin llamar a Resend. */
export type ClienteEmail = {
  emails: {
    send(
      mensaje: {
        from: string;
        to: string;
        subject: string;
        text: string;
        replyTo?: string;
      },
      opciones?: { signal?: AbortSignal },
    ): Promise<{ error: { name: string } | null }>;
  };
};

// Remitente de pruebas de Resend: no hace falta verificar un dominio propio.
const REMITENTE = "onboarding@resend.dev";

/**
 * Avisa por email a `CONTACTO_EMAIL_DESTINO` de una consulta nueva (texto plano, con el email del
 * visitante como `replyTo`). Falla si falta la configuración o si Resend responde con error; el
 * mensaje del error nombra el tipo de error de Resend, nunca la clave ni datos del visitante.
 */
/** Resend respondió con un error. El mensaje lleva solo su `name`, nunca datos del visitante. */
export class EmailRechazadoError extends Error {
  name = "EmailRechazadoError";
}

/** El envío no terminó dentro del tiempo máximo. */
export class EmailTimeoutError extends Error {
  name = "EmailTimeoutError";
}

const TIMEOUT_MS = 8000;

// Caracteres de control y separadores de línea/párrafo: el nombre es texto libre del visitante.
const CONTROL = /[\p{Cc}\p{Zl}\p{Zp}]+/gu;

export async function avisarConsultaNueva(
  consulta: ConsultaCreada,
  cliente?: ClienteEmail,
  opciones: { timeoutMs?: number } = {},
): Promise<void> {
  const config = leerEmailConfig();
  const resend = cliente ?? new Resend(config.RESEND_API_KEY);
  const nombre = consulta.name.replace(CONTROL, " ");
  const timeoutMs = opciones.timeoutMs ?? TIMEOUT_MS;
  const signal = AbortSignal.timeout(timeoutMs);
  // Además de pasarle la señal al cliente, se corta acá: un cliente que la ignore no cuelga el POST.
  const vencido = new Promise<never>((_, rechazar) => {
    signal.addEventListener(
      "abort",
      () => rechazar(new EmailTimeoutError(`el aviso superó ${timeoutMs} ms`)),
      {
        once: true,
      },
    );
  });
  const envio = resend.emails.send(
    {
      from: REMITENTE,
      to: config.CONTACTO_EMAIL_DESTINO,
      subject: `Nueva consulta (${consulta.type}) de ${nombre}`,
      text: [
        `Nombre: ${nombre}`,
        `Email: ${consulta.email}`,
        `Tipo: ${consulta.type}`,
        "",
        consulta.message,
      ].join("\n"),
      replyTo: consulta.email,
    },
    { signal },
  );
  envio.catch(() => {}); // si gana el timeout, que el rechazo tardío no quede sin atender
  const { error } = await Promise.race([envio, vencido]);
  if (error) throw new EmailRechazadoError(`Resend rechazó el aviso: ${error.name}`);
}
