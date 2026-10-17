"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { CONTACT_TYPE_LABELS } from "@/lib/contact";
import type { PuntoAccesos, PuntoDia, PuntoVisitas, TotalTipo } from "@/lib/metricas";

// Gráficos de Recharts del tablero (épica #53, decisión 4). Los datos llegan del servidor ya leídos (la página
// exige admin antes): acá no hay estado propio, así que la página que <Activity> conserva al navegar nunca muestra
// datos viejos (cambian las props con la URL). Para lectores de pantalla y teclado, el gráfico se oculta
// (`aria-hidden`) y la página muestra los mismos datos en una tabla.

// Colores solo de los tokens del manual de marca (src/styles/globals.css).
const COLOR = {
  tinta: "var(--color-tinta)",
  papel: "var(--color-papel)",
  superficie: "var(--color-superficie)",
  primario: "var(--color-primario)",
  acento: "var(--color-acento)",
  secundario: "var(--color-secundario)",
  terciario: "var(--color-terciario)",
} as const;

const REDUCIR = "(prefers-reduced-motion: reduce)";

function suscribir(avisar: () => void): () => void {
  const consulta = window.matchMedia(REDUCIR);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

/**
 * Si se pueden animar los gráficos. En el servidor (y en la hidratación) no: así nunca se anima de más, y con
 * `prefers-reduced-motion: reduce` sigue sin animar.
 */
function useAnimar(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => !window.matchMedia(REDUCIR).matches,
    () => false,
  );
}

/** `2026-10-16` → `16/10`. */
const diaCorto = (fecha: string) => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
/** `2026-10-16` → `16/10/2026`. */
const diaLargo = (fecha: string) => `${diaCorto(fecha)}/${fecha.slice(0, 4)}`;

const ALTO = 260;
const estiloGrafico = { width: "100%", height: ALTO };
const margen = { top: 8, right: 8, bottom: 0, left: -16 };
const tooltip = {
  contentStyle: {
    background: COLOR.papel,
    border: `2px solid ${COLOR.tinta}`,
    borderRadius: 8,
    color: COLOR.tinta,
  },
  labelStyle: { fontWeight: 700 },
};
const eje = { stroke: COLOR.tinta, tick: { fill: COLOR.tinta, fontSize: 12 } };

function Marco({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden="true" className="w-full" style={{ height: ALTO }}>
      {children}
    </div>
  );
}

export function GraficoConsultasPorTipo({ datos }: { datos: TotalTipo[] }) {
  const animar = useAnimar();
  const filas = datos.map((d) => ({ tipo: CONTACT_TYPE_LABELS[d.tipo], total: d.total }));
  return (
    <Marco>
      <BarChart data={filas} responsive style={estiloGrafico} margin={margen} accessibilityLayer={false}>
        <CartesianGrid stroke={COLOR.superficie} vertical={false} />
        <XAxis dataKey="tipo" interval={0} {...eje} />
        <YAxis allowDecimals={false} {...eje} />
        <Tooltip {...tooltip} cursor={{ fill: COLOR.superficie }} />
        <Legend />
        <Bar dataKey="total" name="Consultas" fill={COLOR.secundario} stroke={COLOR.tinta} strokeWidth={2} isAnimationActive={animar} />
      </BarChart>
    </Marco>
  );
}

function GraficoLineaPorDia({ datos, nombre, color }: { datos: PuntoDia[]; nombre: string; color: string }) {
  const animar = useAnimar();
  return (
    <Marco>
      <LineChart data={datos} responsive style={estiloGrafico} margin={margen} accessibilityLayer={false}>
        <CartesianGrid stroke={COLOR.superficie} vertical={false} />
        <XAxis dataKey="fecha" tickFormatter={diaCorto} minTickGap={16} {...eje} />
        <YAxis allowDecimals={false} {...eje} />
        <Tooltip {...tooltip} labelFormatter={(f) => diaLargo(String(f))} />
        <Legend />
        <Line type="monotone" dataKey="total" name={nombre} stroke={color} strokeWidth={3} dot={false} isAnimationActive={animar} />
      </LineChart>
    </Marco>
  );
}

export function GraficoConsultasPorDia({ datos }: { datos: PuntoDia[] }) {
  return <GraficoLineaPorDia datos={datos} nombre="Consultas" color={COLOR.secundario} />;
}

export function GraficoRegistrosPorDia({ datos }: { datos: PuntoDia[] }) {
  return <GraficoLineaPorDia datos={datos} nombre="Usuarios nuevos" color={COLOR.terciario} />;
}

export function GraficoVisitasPorDia({ datos }: { datos: PuntoVisitas[] }) {
  const animar = useAnimar();
  return (
    <Marco>
      <LineChart data={datos} responsive style={estiloGrafico} margin={margen} accessibilityLayer={false}>
        <CartesianGrid stroke={COLOR.superficie} vertical={false} />
        <XAxis dataKey="fecha" tickFormatter={diaCorto} minTickGap={16} {...eje} />
        <YAxis allowDecimals={false} {...eje} />
        <Tooltip {...tooltip} labelFormatter={(f) => diaLargo(String(f))} />
        <Legend />
        <Line type="monotone" dataKey="visitas" name="Visitas" stroke={COLOR.secundario} strokeWidth={3} dot={false} isAnimationActive={animar} />
        <Line
          type="monotone"
          dataKey="unicos"
          name="Visitantes únicos"
          stroke={COLOR.acento}
          strokeWidth={3}
          strokeDasharray="6 4"
          dot={false}
          isAnimationActive={animar}
        />
      </LineChart>
    </Marco>
  );
}

export function GraficoAccesosPorDia({ datos }: { datos: PuntoAccesos[] }) {
  const animar = useAnimar();
  return (
    <Marco>
      <BarChart data={datos} responsive style={estiloGrafico} margin={margen} accessibilityLayer={false}>
        <CartesianGrid stroke={COLOR.superficie} vertical={false} />
        <XAxis dataKey="fecha" tickFormatter={diaCorto} minTickGap={16} {...eje} />
        <YAxis allowDecimals={false} {...eje} />
        <Tooltip {...tooltip} labelFormatter={(f) => diaLargo(String(f))} cursor={{ fill: COLOR.superficie }} />
        <Legend />
        <Bar dataKey="ingreso" name="Ingresos" stackId="accesos" fill={COLOR.primario} stroke={COLOR.tinta} isAnimationActive={animar} />
        <Bar dataKey="detalle" name="Vistas de casos" stackId="accesos" fill={COLOR.terciario} stroke={COLOR.tinta} isAnimationActive={animar} />
      </BarChart>
    </Marco>
  );
}
