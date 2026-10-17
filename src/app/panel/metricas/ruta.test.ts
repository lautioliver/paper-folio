import { describe, expect, it } from "vitest";
import { filtrosDe, rutaMetricas } from "./ruta";

describe("filtrosDe", () => {
  it("toma el rango (7, 30 o 90) y el tipo de la URL", () => {
    expect(filtrosDe({ rango: "7" })).toEqual({ dias: 7 });
    expect(filtrosDe({ rango: "90", tipo: "cotizacion" })).toEqual({ dias: 90, tipo: "cotizacion" });
  });

  it("sin rango o con uno inválido usa 30 días; un tipo inválido se descarta", () => {
    for (const rango of [undefined, "", "14", "7.0", "-7", ["7", "30"], "365", "abc"]) {
      expect(filtrosDe({ rango }).dias).toBe(30);
    }
    for (const tipo of ["otro", ["general"], { $ne: "general" }, ""]) {
      expect(filtrosDe({ rango: "7", tipo })).toEqual({ dias: 7 });
    }
  });
});

describe("rutaMetricas", () => {
  it("arma la URL sin los valores por defecto", () => {
    expect(rutaMetricas()).toBe("/panel/metricas");
    expect(rutaMetricas({ dias: 30 })).toBe("/panel/metricas");
    expect(rutaMetricas({ dias: 7 })).toBe("/panel/metricas?rango=7");
    expect(rutaMetricas({ dias: 90, tipo: "asesoria" })).toBe("/panel/metricas?rango=90&tipo=asesoria");
    expect(rutaMetricas({ dias: 30, tipo: "general" })).toBe("/panel/metricas?tipo=general");
  });
});
