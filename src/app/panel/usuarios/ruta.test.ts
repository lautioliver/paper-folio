import { describe, expect, it } from "vitest";
import { avisoDe, filtrosDe, LARGO_BUSQUEDA, rutaUsuarios } from "./ruta";

describe("filtrosDe", () => {
  it("toma la búsqueda recortada y la página como entero positivo", () => {
    expect(filtrosDe({ q: "  ana ", pagina: "3" })).toEqual({ q: "ana", pagina: 3 });
  });

  it("lo que no sirve cae en los valores por defecto", () => {
    for (const pagina of ["0", "-1", "1.5", "abc", "", ["2", "3"], undefined, "99999999999999999999"]) {
      expect(filtrosDe({ pagina }).pagina).toBe(1);
    }
    expect(filtrosDe({ q: ["a", "b"] }).q).toBe("");
    expect(filtrosDe({ q: "x".repeat(LARGO_BUSQUEDA + 1) }).q).toBe("x".repeat(LARGO_BUSQUEDA));
  });
});

describe("rutaUsuarios", () => {
  it("arma la URL con la búsqueda, la página y el aviso, codificados", () => {
    expect(rutaUsuarios()).toBe("/panel/usuarios");
    expect(rutaUsuarios({ q: "a&b", pagina: 2, aviso: "propio" })).toBe("/panel/usuarios?q=a%26b&pagina=2&aviso=propio");
    expect(rutaUsuarios({ q: "", pagina: 1 })).toBe("/panel/usuarios");
  });
});

describe("avisoDe", () => {
  it("solo muestra avisos conocidos, nunca el texto de la URL", () => {
    expect(avisoDe("ultimo-admin")).toMatchObject({ tipo: "error" });
    expect(avisoDe("bloqueado")).toMatchObject({ tipo: "ok" });
    expect(avisoDe("<script>")).toBeNull();
    expect(avisoDe(["propio"])).toBeNull();
    expect(avisoDe("toString")).toBeNull();
    expect(avisoDe(undefined)).toBeNull();
  });
});
