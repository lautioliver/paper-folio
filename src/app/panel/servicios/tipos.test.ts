import { describe, expect, it } from "vitest";
import { claveDelFormulario, FORMULARIO_INICIAL, valoresAMostrar, type ValoresFormulario } from "./tipos";

const INICIAL: ValoresFormulario = {
  titulo: "Frontend",
  descripcion: "Interfaces",
  ilustracion: "icono",
  icono: "frontend",
  imagen: "",
  publicado: true,
};

describe("valoresAMostrar", () => {
  it("sin envío, los iniciales", () => {
    expect(valoresAMostrar(FORMULARIO_INICIAL, INICIAL)).toEqual(INICIAL);
  });

  it("tras un error del servidor, todo lo que se mandó: ícono, imagen y el resto", () => {
    const conIcono = { ...INICIAL, titulo: "Repetido", icono: "deploy", publicado: false };
    expect(valoresAMostrar({ error: "x", campos: {}, valores: conIcono, envio: 1 }, INICIAL)).toEqual(conIcono);

    const conImagen = { ...INICIAL, ilustracion: "imagen", icono: "", imagen: "https://blob.example/a.png" };
    expect(valoresAMostrar({ error: "x", campos: {}, valores: conImagen, envio: 2 }, INICIAL)).toEqual(conImagen);
  });
});

describe("claveDelFormulario", () => {
  it("cambia con cada respuesta, aunque los valores sean los mismos (dos errores seguidos)", () => {
    const valores = { ...INICIAL, icono: "deploy" };
    const primera = claveDelFormulario({ error: "x", campos: {}, valores, envio: 1 });
    const segunda = claveDelFormulario({ error: "x", campos: {}, valores, envio: 2 });
    expect(primera).not.toBe(claveDelFormulario(FORMULARIO_INICIAL));
    expect(segunda).not.toBe(primera);
  });
});
