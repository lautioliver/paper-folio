import type { SendMailOptions } from "nodemailer";

/** Lo mínimo de un transporte de nodemailer que usamos: se inyecta para testear sin Gmail. */
export type TransporteEmail = {
  sendMail(mensaje: SendMailOptions): Promise<unknown>;
  close?(): void;
};

export type ResultadoRespuesta =
  | { ok: true; estadoCambiado: boolean }
  | {
      ok: false;
      error: "invalida" | "no-encontrada" | "estado-invalido" | "envio-fallido";
      mensaje: string;
    };

/** STUB */
export async function responderConsulta(
  _id: string,
  _texto: unknown,
  _autor: string,
  _transporte?: TransporteEmail,
  _opciones: { timeoutMs?: number } = {},
): Promise<ResultadoRespuesta> {
  return { ok: false, error: "invalida", mensaje: "stub" };
}
