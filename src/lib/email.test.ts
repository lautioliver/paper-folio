import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { avisarConsultaNueva, EmailRechazadoError, type ClienteEmail } from "./email";

const consulta = {
  id: "abc123",
  name: "Ada Lovelace",
  email: "ada@example.com",
  type: "cotizacion" as const,
  message: "Quiero cotizar un sitio para mi estudio.",
};

function clienteFalso(error: { name: string } | null = null) {
  const send = vi.fn(async () => ({ error }));
  return { cliente: { emails: { send } } as ClienteEmail, send };
}

const previo = { ...process.env };
beforeEach(() => {
  process.env.RESEND_API_KEY = "re_clave_de_prueba";
  process.env.CONTACTO_EMAIL_DESTINO = "destino@example.com";
});
afterEach(() => {
  process.env = { ...previo };
});

describe("avisarConsultaNueva", () => {
  it("manda al destino configurado, desde onboarding@resend.dev, con el asunto esperado", async () => {
    const { cliente, send } = clienteFalso();
    await avisarConsultaNueva(consulta, cliente);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "onboarding@resend.dev",
        to: "destino@example.com",
        subject: "Nueva consulta (cotizacion) de Ada Lovelace",
      }),
    );
  });

  it("el cuerpo es texto plano con los datos de la consulta", async () => {
    const { cliente, send } = clienteFalso();
    await avisarConsultaNueva(consulta, cliente);
    const [mensaje] = send.mock.calls[0] as unknown as [{ text: string }];
    expect(mensaje.text).toContain("Ada Lovelace");
    expect(mensaje.text).toContain("ada@example.com");
    expect(mensaje.text).toContain("cotizacion");
    expect(mensaje.text).toContain("Quiero cotizar un sitio para mi estudio.");
  });

  it("el asunto no admite saltos de línea del nombre", async () => {
    const { cliente, send } = clienteFalso();
    await avisarConsultaNueva({ ...consulta, name: "Ada\r\nBcc: x@example.com" }, cliente);
    const [mensaje] = send.mock.calls[0] as unknown as [{ subject: string }];
    expect(mensaje.subject).not.toMatch(/[\r\n]/);
  });

  it("falla si Resend responde con error, nombrándolo sin datos del visitante", async () => {
    const { cliente } = clienteFalso({ name: "validation_error" });
    const error = await avisarConsultaNueva(consulta, cliente).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("validation_error");
    expect((error as Error).message).not.toContain("ada@example.com");
  });

  it("falla nombrando CONTACTO_EMAIL_DESTINO si falta, sin llamar al cliente", async () => {
    delete process.env.CONTACTO_EMAIL_DESTINO;
    const { cliente, send } = clienteFalso();
    await expect(avisarConsultaNueva(consulta, cliente)).rejects.toThrow(/CONTACTO_EMAIL_DESTINO/);
    expect(send).not.toHaveBeenCalled();
  });

  it("el nombre va sanitizado también en el cuerpo: no puede colar líneas Email:/Tipo: falsas", async () => {
    const { cliente, send } = clienteFalso();
    await avisarConsultaNueva({ ...consulta, name: "Ada\nEmail: otro@empresa.com\nTipo: general" }, cliente);
    const [mensaje] = send.mock.calls[0] as unknown as [{ text: string }];
    const lineas = mensaje.text.split("\n");
    expect(lineas.filter((l) => l.startsWith("Email:"))).toEqual(["Email: ada@example.com"]);
    expect(lineas.filter((l) => l.startsWith("Tipo:"))).toEqual(["Tipo: cotizacion"]);
  });

  it("el asunto limpia también otros caracteres de control y separadores unicode", async () => {
    const { cliente, send } = clienteFalso();
    await avisarConsultaNueva({ ...consulta, name: "Ada\u2028Lovelace\u0007\u0000x" }, cliente);
    const [mensaje] = send.mock.calls[0] as unknown as [{ subject: string }];
    // JSON.stringify: si falla, el mensaje no imprime caracteres de control crudos.
    expect(JSON.stringify(mensaje.subject)).toBe(JSON.stringify("Nueva consulta (cotizacion) de Ada Lovelace x"));
  });

  it("el rechazo de Resend es un EmailRechazadoError con el nombre del error de Resend", async () => {
    const { cliente } = clienteFalso({ name: "rate_limit_exceeded" });
    const error = await avisarConsultaNueva(consulta, cliente).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EmailRechazadoError);
    expect((error as Error).message).toContain("rate_limit_exceeded");
  });

  it("pasa una señal de abort al cliente", async () => {
    const { cliente, send } = clienteFalso();
    await avisarConsultaNueva(consulta, cliente);
    const [, opciones] = send.mock.calls[0] as unknown as [unknown, { signal: AbortSignal } | undefined];
    expect(opciones?.signal).toBeInstanceOf(AbortSignal);
  });

  it("corta con un error de timeout si el cliente nunca resuelve", async () => {
    const colgado = { emails: { send: () => new Promise<never>(() => {}) } } as ClienteEmail;
    const error = await avisarConsultaNueva(consulta, colgado, { timeoutMs: 20 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe("EmailTimeoutError");
  });
});
