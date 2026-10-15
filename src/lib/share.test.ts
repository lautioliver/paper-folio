import { describe, expect, it, vi } from "vitest";
import { copyText, projectShareUrl, shareOrCopy } from "./share";

const data = { title: "Ucanode", url: "https://ucanode.example/" };

describe("shareOrCopy", () => {
  it("usa navigator.share con título y url cuando existe", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    expect(await shareOrCopy(data, { share, clipboard: { writeText } })).toBe("compartido");
    expect(share).toHaveBeenCalledWith({ title: data.title, url: data.url });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("sin navigator.share copia el link al portapapeles", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareOrCopy(data, { clipboard: { writeText } })).toBe("copiado");
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  it("si la persona cancela el diálogo no es un error ni copia", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("cancelado", "AbortError"));
    const writeText = vi.fn();
    expect(await shareOrCopy(data, { share, clipboard: { writeText } })).toBe("cancelado");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("si share falla por otra razón cae a copiar", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("no", "NotAllowedError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareOrCopy(data, { share, clipboard: { writeText } })).toBe("copiado");
  });

  it("sin share ni portapapeles devuelve error sin lanzar", async () => {
    expect(await shareOrCopy(data, {})).toBe("error");
  });

  it("si el portapapeles rechaza devuelve error sin lanzar", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denegado"));
    expect(await shareOrCopy(data, { clipboard: { writeText } })).toBe("error");
  });
});

describe("copyText", () => {
  it("escribe el texto y devuelve true", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await copyText("hola", { clipboard: { writeText } })).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hola");
  });

  it("devuelve false sin portapapeles o si rechaza", async () => {
    expect(await copyText("hola", {})).toBe(false);
    const writeText = vi.fn().mockRejectedValue(new Error("denegado"));
    expect(await copyText("hola", { clipboard: { writeText } })).toBe(false);
  });
});

describe("projectShareUrl", () => {
  it("apunta a la tarjeta del proyecto en el portfolio", () => {
    expect(projectShareUrl("https://paperfolio.example", "ucanode")).toBe("https://paperfolio.example/#proyecto-ucanode");
  });
});
