import { describe, expect, it } from "vitest";
import {
  ESTADOS_CONSULTA,
  esTransicionValida,
  origenesDe,
} from "./estados-consulta";

// Épica #36, decisión 2: nueva → en_curso → respondida → archivada; de archivada se vuelve a en_curso.
const VALIDAS = new Set([
  "nueva>en_curso",
  "en_curso>respondida",
  "respondida>archivada",
  "archivada>en_curso",
]);

describe("esTransicionValida", () => {
  it("solo acepta las transiciones de la épica, en todos los pares de estados", () => {
    for (const desde of ESTADOS_CONSULTA) {
      for (const hacia of ESTADOS_CONSULTA) {
        expect(esTransicionValida(desde, hacia), `${desde} → ${hacia}`).toBe(
          VALIDAS.has(`${desde}>${hacia}`),
        );
      }
    }
  });

  it("nunca se vuelve a nueva, ni desde archivada ni desde respondida", () => {
    expect(esTransicionValida("respondida", "nueva")).toBe(false);
    expect(esTransicionValida("archivada", "nueva")).toBe(false);
  });

  it("un estado desconocido nunca es una transición válida", () => {
    expect(esTransicionValida("nueva", "cerrada")).toBe(false);
    expect(esTransicionValida("cerrada", "en_curso")).toBe(false);
    expect(esTransicionValida("constructor", "en_curso")).toBe(false);
  });
});

describe("origenesDe", () => {
  it("devuelve los estados desde los que se llega a cada uno", () => {
    expect(origenesDe("en_curso").sort()).toEqual(["archivada", "nueva"]);
    expect(origenesDe("respondida")).toEqual(["en_curso"]);
    expect(origenesDe("archivada")).toEqual(["respondida"]);
    expect(origenesDe("nueva")).toEqual([]);
  });
});
