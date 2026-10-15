import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("une las clases con un espacio", () => {
    expect(cn("p-4", "font-bold")).toBe("p-4 font-bold");
  });

  it("descarta los valores vacíos para las clases condicionales", () => {
    const activo = false;
    expect(cn("p-4", activo && "bg-black", null, undefined, "")).toBe("p-4");
  });

  it("sin clases devuelve un string vacío", () => {
    expect(cn()).toBe("");
  });
});
