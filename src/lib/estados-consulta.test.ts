import { describe, expect, it } from "vitest";
import {
  ESTADOS_CONSULTA,
  ESTADOS_PARA_RESPONDER,
  LARGO_MAXIMO_RESPUESTA,
  estadoLeido,
  filtroDeEstados,
  LARGO_MAXIMO_NOTA,
  origenesDe,
} from "./estados-consulta";

// Épica #36, decisión 2: nueva → en_curso → respondida → archivada; de archivada se vuelve a en_curso.
// Más nueva → archivada y respondida → en_curso (aprobadas por @lautioliver en #39).
const VALIDAS = new Set([
  "nueva>en_curso",
  "nueva>archivada",
  "en_curso>respondida",
  "respondida>archivada",
  "respondida>en_curso",
  "archivada>en_curso",
]);

describe("origenesDe", () => {
  it("solo acepta las transiciones de la épica, en todos los pares de estados", () => {
    for (const desde of ESTADOS_CONSULTA) {
      for (const hacia of ESTADOS_CONSULTA) {
        expect(origenesDe(hacia).includes(desde), `${desde} → ${hacia}`).toBe(
          VALIDAS.has(`${desde}>${hacia}`),
        );
      }
    }
  });

  it("devuelve los estados desde los que se llega a cada uno; a nueva no se vuelve nunca", () => {
    expect(origenesDe("en_curso").sort()).toEqual([
      "archivada",
      "nueva",
      "respondida",
    ]);
    expect(origenesDe("respondida")).toEqual(["en_curso"]);
    expect(origenesDe("archivada").sort()).toEqual(["nueva", "respondida"]);
    expect(origenesDe("nueva")).toEqual([]);
  });
});

describe("estadoLeido (hallazgo de la autorevisión)", () => {
  it("un estado guardado desconocido o ausente se trata como nueva", () => {
    expect(estadoLeido("raro")).toBe("nueva");
    expect(estadoLeido(undefined)).toBe("nueva");
    expect(estadoLeido(null)).toBe("nueva");
    expect(estadoLeido("constructor")).toBe("nueva");
    for (const e of ESTADOS_CONSULTA) expect(estadoLeido(e)).toBe(e);
  });
});

describe("filtroDeEstados", () => {
  it("con nueva incluye los documentos con un estado desconocido o sin estado", () => {
    expect(filtroDeEstados(["nueva"])).toEqual({
      $nin: ["en_curso", "respondida", "archivada"],
    });
    expect(filtroDeEstados(["nueva", "archivada"])).toEqual({
      $nin: ["en_curso", "respondida"],
    });
  });

  it("sin nueva, solo los estados pedidos", () => {
    expect(filtroDeEstados(["respondida"])).toEqual({ $in: ["respondida"] });
    expect(filtroDeEstados([])).toEqual({ $in: [] });
  });
});

describe("LARGO_MAXIMO_NOTA", () => {
  it("es 2000, compartido por el cliente y el servidor", () => {
    expect(LARGO_MAXIMO_NOTA).toBe(2000);
  });
});

describe("ESTADOS_PARA_RESPONDER (#40)", () => {
  it("solo se responde desde en_curso: responder no abre un camino a respondida que la tabla no tenga", () => {
    expect([...ESTADOS_PARA_RESPONDER]).toEqual(["en_curso"]);
    expect([...ESTADOS_PARA_RESPONDER]).toEqual(origenesDe("respondida"));
  });

  it("una respuesta tiene hasta 5000 caracteres", () => {
    expect(LARGO_MAXIMO_RESPUESTA).toBe(5000);
  });
});
