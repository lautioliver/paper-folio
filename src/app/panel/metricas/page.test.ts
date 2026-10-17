import { beforeEach, describe, expect, it, vi } from "vitest";

// La página no puede importar `@/auth` en Vitest: se mockean los permisos, el servicio y los gráficos (cliente).
// `vi.hoisted`: los mocks de `vi.mock` se evalúan antes que el resto del archivo.
const { requerirRol, leidas, metricas } = vi.hoisted(() => {
  const leidas: string[] = [];
  const serie = (nombre: string) =>
    vi.fn(async (...a: unknown[]) => {
      leidas.push(nombre);
      void a;
      return [];
    });
  return {
    requerirRol: vi.fn(),
    leidas,
    metricas: {
      consultasPorTipo: serie("consultasPorTipo"),
      consultasPorDia: serie("consultasPorDia"),
      registrosPorDia: serie("registrosPorDia"),
      visitasPorDia: serie("visitasPorDia"),
      accesosPorDia: serie("accesosPorDia"),
    },
  };
});
vi.mock("@/lib/permisos", () => ({ requerirRol: (...a: unknown[]) => requerirRol(...a) }));
vi.mock("@/lib/metricas", async (original) => ({ ...(await original<typeof import("@/lib/metricas")>()), ...metricas }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("./graficos", () => ({
  GraficoConsultasPorTipo: () => null,
  GraficoConsultasPorDia: () => null,
  GraficoRegistrosPorDia: () => null,
  GraficoVisitasPorDia: () => null,
  GraficoAccesosPorDia: () => null,
}));

import MetricasPage from "./page";

const props = (q: Record<string, unknown> = {}) =>
  ({ params: Promise.resolve({}), searchParams: Promise.resolve(q) }) as unknown as PageProps<"/panel/metricas">;

beforeEach(() => {
  leidas.length = 0;
  requerirRol.mockReset().mockImplementation(async () => {
    leidas.push("requerirRol");
    return { id: "a1", rol: "admin" };
  });
  for (const f of Object.values(metricas)) f.mockClear();
});

describe("/panel/metricas", () => {
  it("exige admin antes de leer las métricas, con el rango y el tipo de la URL", async () => {
    await MetricasPage(props({ rango: "7", tipo: "cotizacion" }));
    expect(requerirRol).toHaveBeenCalledWith("/panel/metricas", "admin");
    expect(leidas[0]).toBe("requerirRol");
    expect(leidas).toHaveLength(6);
    const [rango] = metricas.accesosPorDia.mock.calls[0] as [{ desde: string; hasta: string }];
    expect(metricas.consultasPorDia).toHaveBeenCalledWith({ ...rango, tipo: "cotizacion" });
    const dias = (Date.parse(rango.hasta) - Date.parse(rango.desde)) / 86_400_000 + 1;
    expect(dias).toBe(7);
  });

  it("a un operador le responde 403 sin leer ninguna métrica", async () => {
    requerirRol.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));
    await expect(MetricasPage(props())).rejects.toThrow("403");
    for (const f of Object.values(metricas)) expect(f).not.toHaveBeenCalled();
  });
});
