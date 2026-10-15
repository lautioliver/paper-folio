import { Resend } from "resend";
import type { ConsultaCreada } from "./consultas";
import { leerEmailConfig } from "./env";

/** Lo mínimo del cliente de Resend que usamos: se inyecta para testear sin llamar a Resend. */
export type ClienteEmail = {
  emails: {
    send(mensaje: {
      from: string;
      to: string;
      subject: string;
      text: string;
      replyTo?: string;
    }): Promise<{ error: { name: string } | null }>;
  };
};

// Remitente de pruebas de Resend: no hace falta verificar un dominio propio.
const REMITENTE = "onboarding@resend.dev";

/**
 * Avisa por email a `CONTACTO_EMAIL_DESTINO` de una consulta nueva (texto plano, con el email del
 * visitante como `replyTo`). Falla si falta la configuración o si Resend responde con error; el
 * mensaje del error nombra el tipo de error de Resend, nunca la clave ni datos del visitante.
 */
export async function avisarConsultaNueva(consulta: ConsultaCreada, cliente?: ClienteEmail): Promise<void> {
  const config = leerEmailConfig();
  const resend = cliente ?? (new Resend(config.RESEND_API_KEY) as unknown as ClienteEmail);
  // Sin saltos de línea: el nombre es texto libre del visitante y va en el asunto.
  const nombre = consulta.name.replace(/[\r\n]+/g, " ");
  const { error } = await resend.emails.send({
    from: REMITENTE,
    to: config.CONTACTO_EMAIL_DESTINO,
    subject: `Nueva consulta (${consulta.type}) de ${nombre}`,
    text: [
      `Nombre: ${consulta.name}`,
      `Email: ${consulta.email}`,
      `Tipo: ${consulta.type}`,
      "",
      consulta.message,
    ].join("\n"),
    replyTo: consulta.email,
  });
  if (error) throw new Error(`Resend rechazó el aviso: ${error.name}`);
}
