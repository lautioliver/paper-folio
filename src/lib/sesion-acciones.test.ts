import { beforeEach, describe, expect, it, vi } from "vitest";

// `@/auth` no resuelve en Vitest (next-auth importa next/server): se mockean signIn y signOut.
const signIn = vi.fn();
const signOut = vi.fn();
vi.mock("@/auth", () => ({
  signIn: (...a: unknown[]) => signIn(...a),
  signOut: (...a: unknown[]) => signOut(...a),
}));

import { ingresarConGoogle, ingresarConOtraCuenta, salirEIngresarDeNuevo } from "./sesion-acciones";

const formulario = (callbackUrl?: string | File) => {
  const datos = new FormData();
  if (callbackUrl !== undefined) datos.set("callbackUrl", callbackUrl);
  return datos;
};

beforeEach(() => {
  signIn.mockReset();
  signOut.mockReset();
});

describe("ingresarConGoogle (#45)", () => {
  it("ingresa con Google y vuelve al callbackUrl interno, sin forzar el selector de cuentas", async () => {
    await ingresarConGoogle(formulario("/proyectos/a"));
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/proyectos/a" });
  });

  it("un callbackUrl externo, a /ingresar, un archivo o ninguno vuelven a /", async () => {
    for (const valor of ["https://otro.sitio", "//otro.sitio", "/ingresar?error=AccessDenied", "/ingresar/", new File(["x"], "a.txt"), undefined]) {
      signIn.mockReset();
      await ingresarConGoogle(formulario(valor));
      expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/" });
    }
  });
});

describe("ingresarConOtraCuenta (Probar con otra cuenta, #45)", () => {
  it("abre el selector de cuentas de Google y conserva el callbackUrl", async () => {
    await ingresarConOtraCuenta(formulario("/proyectos/a"));
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/proyectos/a" }, { prompt: "select_account" });
  });

  it("un callbackUrl externo o un archivo vuelven a /", async () => {
    for (const valor of ["https://otro.sitio", new File(["x"], "a.txt")]) {
      signIn.mockReset();
      await ingresarConOtraCuenta(formulario(valor));
      expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/" }, { prompt: "select_account" });
    }
  });
});

describe("salirEIngresarDeNuevo (#45)", () => {
  it("sale y deja en /ingresar con el callbackUrl interno; uno inválido vuelve a /", async () => {
    await salirEIngresarDeNuevo(formulario("/cuenta"));
    expect(signOut).toHaveBeenLastCalledWith({ redirectTo: "/ingresar?callbackUrl=%2Fcuenta" });
    await salirEIngresarDeNuevo(formulario(new File(["x"], "a.txt")));
    expect(signOut).toHaveBeenLastCalledWith({ redirectTo: "/ingresar?callbackUrl=%2F" });
  });
});
