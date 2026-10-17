import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { crearDeduplicador } from "./contador-visitas";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("crearDeduplicador (cuándo ContadorVisitas manda el aviso)", () => {
  // Sin opciones: el modo de desarrollo, con StrictMode.
  it("cuenta el primer montaje", () => {
    expect(crearDeduplicador().montar("/")).toBe(true);
  });

  it("no cuenta dos veces el doble efecto de StrictMode (desmontar y montar enseguida, la misma ruta)", () => {
    const d = crearDeduplicador();
    expect(d.montar("/")).toBe(true);
    d.desmontar();
    expect(d.montar("/")).toBe(false);
  });

  it("en producción cuenta cada montaje: no depende del orden de los timers (StrictMode no corre ahí)", () => {
    const d = crearDeduplicador({ produccion: true });
    expect(d.montar("/")).toBe(true);
    d.desmontar();
    expect(d.montar("/")).toBe(true); // Activity vuelve a mostrar el layout en el mismo task
    d.desmontar();
    vi.runAllTimers();
    expect(d.montar("/")).toBe(true);
  });

  it("cuenta cada cambio de ruta", () => {
    const d = crearDeduplicador();
    expect(d.montar("/")).toBe(true);
    d.desmontar();
    expect(d.montar("/proyectos")).toBe(true);
    d.desmontar();
    expect(d.montar("/")).toBe(true);
  });

  it("cuenta la vuelta a la misma ruta después de quedar oculta (Activity al ir a /ingresar o /panel)", () => {
    const d = crearDeduplicador();
    expect(d.montar("/")).toBe(true);
    d.desmontar(); // Activity oculta el layout de (sitio)
    vi.runAllTimers(); // la navegación a otra ruta termina después
    expect(d.montar("/")).toBe(true); // vuelve a mostrarse
  });
});
