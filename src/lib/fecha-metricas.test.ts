import { describe, expect, it } from "vitest";
import { diaCorto, diaLargo, diasEntre, fechaDeMetrica, inicioDelDia, sumarDias } from "./fecha-metricas";

describe("fechaDeMetrica", () => {
  it("toma el día de Salta, no el de UTC", () => {
    expect(fechaDeMetrica(new Date("2026-10-17T02:30:00Z"))).toBe("2026-10-16");
    expect(fechaDeMetrica(new Date("2026-10-17T03:00:00Z"))).toBe("2026-10-17");
  });
});

describe("inicioDelDia", () => {
  it("es la medianoche de Salta (UTC-3) en UTC", () => {
    expect(inicioDelDia("2026-10-16").toISOString()).toBe("2026-10-16T03:00:00.000Z");
    expect(inicioDelDia("2027-01-01").toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("vuelve a dar el mismo día con fechaDeMetrica", () => {
    for (const fecha of ["2026-03-01", "2026-07-19", "2026-12-31"]) {
      expect(fechaDeMetrica(inicioDelDia(fecha))).toBe(fecha);
      expect(fechaDeMetrica(new Date(inicioDelDia(fecha).getTime() - 1))).toBe(sumarDias(fecha, -1));
    }
  });
});

describe("inicioDelDia en una zona con horario de verano", () => {
  it("toma el desfase de la medianoche local, no el de la medianoche UTC", () => {
    // Santiago de Chile atrasa la hora a las 00:00 (-03) del 5 de abril de 2026: el día empieza a las 00:00 -04.
    expect(inicioDelDia("2026-04-05", "America/Santiago").toISOString()).toBe("2026-04-05T04:00:00.000Z");
    expect(inicioDelDia("2026-04-04", "America/Santiago").toISOString()).toBe("2026-04-04T03:00:00.000Z");
  });
});

describe("diaCorto y diaLargo", () => {
  it("muestran el día sin pasar por Date", () => {
    expect(diaCorto("2026-10-06")).toBe("06/10");
    expect(diaLargo("2026-10-06")).toBe("06/10/2026");
  });
});

describe("sumarDias", () => {
  it("cruza meses y años", () => {
    expect(sumarDias("2026-02-28", 1)).toBe("2026-03-01");
    expect(sumarDias("2026-01-01", -1)).toBe("2025-12-31");
    expect(sumarDias("2026-10-16", -89)).toBe("2026-07-19");
  });
});

describe("diasEntre", () => {
  it("lista los días de punta a punta, en orden", () => {
    expect(diasEntre("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
    expect(diasEntre("2026-10-16", "2026-10-16")).toEqual(["2026-10-16"]);
  });
});
