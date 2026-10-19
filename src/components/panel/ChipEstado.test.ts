import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChipEstado } from "./ChipEstado";

describe("ChipEstado", () => {
  it("En curso usa texto tinta sobre secundario (5,2:1; texto blanco da 3,78:1)", () => {
    const html = renderToStaticMarkup(createElement(ChipEstado, { estado: "en_curso" }));
    expect(html).toContain("bg-secundario");
    expect(html).toContain("text-tinta");
    expect(html).not.toContain("text-papel");
  });
});
