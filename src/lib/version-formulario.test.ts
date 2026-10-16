import { describe, expect, it } from "vitest";
import { VERSION_NUEVO, versionDe } from "./version-formulario";

describe("versionDe", () => {
  it("cambia con cada guardado (otra fecha de modificación) y es estable para la misma", () => {
    const antes = new Date("2026-10-16T10:00:00.000Z");
    const despues = new Date("2026-10-16T10:00:00.001Z");
    expect(versionDe(antes)).toBe(versionDe(new Date(antes)));
    expect(versionDe(despues)).not.toBe(versionDe(antes));
    expect(versionDe("2026-10-16T10:00:00.000Z")).toBe(versionDe(antes));
  });

  it("sin fecha (un documento cargado a mano), una versión fija distinta de la de un alta", () => {
    expect(versionDe(undefined)).toBe(versionDe(null));
    expect(versionDe(undefined)).not.toBe(VERSION_NUEVO);
    expect(versionDe(new Date(0))).not.toBe(versionDe(undefined));
  });

  it("una fecha inválida cuenta como sin fecha (no lanza)", () => {
    expect(versionDe("no-es-fecha")).toBe(versionDe(undefined));
  });
});
