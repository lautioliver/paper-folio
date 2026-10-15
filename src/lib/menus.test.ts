import { describe, expect, it, vi } from "vitest";
import { alAbrirOtroMenu, avisarMenuAbierto } from "./menus";

describe("menus de la barra", () => {
  it("abrir uno cierra a los otros, no a sí mismo", () => {
    const cierraCuenta = vi.fn();
    const cierraCelular = vi.fn();
    const quitar = [alAbrirOtroMenu("cuenta", cierraCuenta), alAbrirOtroMenu("celular", cierraCelular)];
    avisarMenuAbierto("celular");
    expect(cierraCuenta).toHaveBeenCalledTimes(1);
    expect(cierraCelular).not.toHaveBeenCalled();
    quitar.forEach((q) => q());
  });

  it("quien deja de escuchar no recibe más avisos", () => {
    const cerrar = vi.fn();
    alAbrirOtroMenu("cuenta", cerrar)();
    avisarMenuAbierto("celular");
    expect(cerrar).not.toHaveBeenCalled();
  });
});
