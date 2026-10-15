import type { ConsultaCreada } from "./consultas";

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

export async function avisarConsultaNueva(_consulta: ConsultaCreada, _cliente?: ClienteEmail): Promise<void> {}
