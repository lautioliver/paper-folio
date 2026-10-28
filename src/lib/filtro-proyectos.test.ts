import { describe, expect, it } from "vitest";
import { categoriasDe, filtrarPorCategoria } from "./filtro-proyectos";

const items = [
  { slug: "a", categoria: "Web" },
  { slug: "b", categoria: "Mobile" },
  { slug: "c", categoria: "Web" },
];

describe("categoriasDe", () => {
  it("devuelve las categorías sin repetir, en orden de aparición", () => {
    expect(categoriasDe(items)).toEqual(["Web", "Mobile"]);
  });
  it("sin items no hay categorías", () => {
    expect(categoriasDe([])).toEqual([]);
  });
});

describe("filtrarPorCategoria", () => {
  it("con null devuelve todo", () => {
    expect(filtrarPorCategoria(items, null)).toEqual(items);
  });
  it("con una categoría devuelve solo esa, conservando el orden", () => {
    expect(filtrarPorCategoria(items, "Web").map((i) => i.slug)).toEqual(["a", "c"]);
  });
  it("una categoría que no existe devuelve vacío", () => {
    expect(filtrarPorCategoria(items, "Otra")).toEqual([]);
  });
});
