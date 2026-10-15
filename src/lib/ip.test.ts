import { describe, expect, it } from "vitest";
import { leerIp } from "./ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("leerIp", () => {
  it("toma el primer valor de x-forwarded-for, sin espacios", () => {
    expect(leerIp(h({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1, 10.0.0.2" }))).toBe("203.0.113.7");
  });

  it("usa x-real-ip si no hay x-forwarded-for o viene vacío", () => {
    expect(leerIp(h({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(leerIp(h({ "x-forwarded-for": " , 10.0.0.1", "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("prefiere x-forwarded-for sobre x-real-ip", () => {
    expect(leerIp(h({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.4" }))).toBe("203.0.113.7");
  });

  it("devuelve vacío si no hay ninguna", () => {
    expect(leerIp(h({}))).toBe("");
  });
});
