import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Sin entorno de DOM: se lee el fuente, como en servicios/formulario.test.ts.
// Un botón `disabled` pierde el foco: quien usa teclado vuelve al body en cada acción (revisión de #102).
const listas = ["demos", "servicios"] as const;

describe.each(listas)("controles de %s", (lista) => {
  const fuente = readFileSync(fileURLToPath(new URL(`./${lista}/controles.tsx`, import.meta.url)), "utf8");
  const botones = fuente.match(/<button[\s\S]*?>/g) ?? [];

  it("tiene botones que revisar", () => {
    expect(botones.length).toBeGreaterThanOrEqual(4);
  });

  it("no deshabilita botones con disabled, que les saca el foco", () => {
    for (const boton of botones) expect(boton).not.toMatch(/\sdisabled=\{/);
  });

  it("marca el bloqueo con aria-disabled en cada botón", () => {
    for (const boton of botones) expect(boton).toMatch(/aria-disabled=\{/);
  });

  it("cada formulario frena el envío cuando el botón está bloqueado", () => {
    const formularios = fuente.match(/<form[\s\S]*?>/g) ?? [];
    expect(formularios.length).toBe(botones.length);
    for (const form of formularios) expect(form).toMatch(/onSubmit=/);
  });
});
