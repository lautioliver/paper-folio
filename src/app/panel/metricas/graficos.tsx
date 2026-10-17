"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import type { ContactType } from "@/lib/contact";
import { diaCorto, diaLargo } from "@/lib/fecha-metricas";
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

const ALTO = 260;
const estiloGrafico = { width: "100%", height: ALTO };
const margen = { top: 8, right: 8, bottom: 0, left: 0 };
const tooltip = {
  contentStyle: {
    background: COLOR.papel,
    border: `2px solid ${COLOR.tinta}`,
    borderRadius: 8,
    color: COLOR.tinta,
  },
  labelStyle: { fontWeight: 700 },
};
// El texto de la leyenda en tinta (Recharts lo pinta del color de la serie: el amarillo no se lee sobre papel).
const leyenda = (valor: string) => <span style={{ color: COLOR.tinta }}>{valor}</span>;
// Nombres cortos en el eje: los largos se pisan a 375 px (la tabla usa los completos).
const TIPO_CORTO: Record<ContactType, string> = { general: "General", cotizacion: "Cotización", asesoria: "Asesoría" };
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
  const filas = datos.map((d) => ({ tipo: TIPO_CORTO[d.tipo], total: d.total }));
  return (
    <Marco>
      <BarChart data={filas} responsive style={estiloGrafico} margin={margen} accessibilityLayer={false}>
        <CartesianGrid stroke={COLOR.superficie} vertical={false} />
        <XAxis dataKey="tipo" interval={0} {...eje} />
        <YAxis allowDecimals={false} width="auto" {...eje} />
        <Tooltip {...tooltip} cursor={{ fill: COLOR.superficie }} />
        <Legend formatter={leyenda} />
        <Bar dataKey="total" name="Consultas" fill={COLOR.secundario} stroke={COLOR.tinta} strokeWidth={2} isAnimationActive={animar} />
      </BarChart>
    </Marco>
  );
}

type Serie = { clave: string; nombre: string; color: string; punteada?: boolean };

/** Una o más series por día en líneas, con las fechas cortas en el eje y la larga en el tooltip. */
function GraficoLineasPorDia<T extends { fecha: string }>({ datos, series }: { datos: T[]; series: Serie[] }) {
  const animar = useAnimar();
  return (
    <Marco>
      <LineChart data={datos} responsive style={estiloGrafico} margin={margen} accessibilityLayer={false}>
        <CartesianGrid stroke={COLOR.superficie} vertical={false} />
        <XAxis dataKey="fecha" tickFormatter={diaCorto} minTickGap={16} {...eje} />
        <YAxis allowDecimals={false} width="auto" {...eje} />
        <Tooltip {...tooltip} labelFormatter={(f) => diaLargo(String(f))} />
        <Legend formatter={leyenda} />
        {series.map((s) => (
          <Line
            key={s.clave}
            type="linear"
            dataKey={s.clave}
            name={s.nombre}
            stroke={s.color}
            strokeWidth={3}
            strokeDasharray={s.punteada ? "6 4" : undefined}
            dot={false}
            isAnimationActive={animar}
          />
        ))}
      </LineChart>
    </Marco>
  );
}

export function GraficoConsultasPorDia({ datos }: { datos: PuntoDia[] }) {
  return <GraficoLineasPorDia datos={datos} series={[{ clave: "total", nombre: "Consultas", color: COLOR.secundario }]} />;
}

export function GraficoRegistrosPorDia({ datos }: { datos: PuntoDia[] }) {
  return <GraficoLineasPorDia datos={datos} series={[{ clave: "total", nombre: "Usuarios nuevos", color: COLOR.terciario }]} />;
}

export function GraficoVisitasPorDia({ datos }: { datos: PuntoVisitas[] }) {
  return (
    <GraficoLineasPorDia
      datos={datos}
      series={[
        { clave: "visitas", nombre: "Visitas", color: COLOR.secundario },
        { clave: "unicos", nombre: "Visitantes únicos", color: COLOR.acento, punteada: true },
      ]}
    />
  );
}

export function GraficoAccesosPorDia({ datos }: { datos: PuntoAccesos[] }) {
  const animar = useAnimar();
  return (
    <Marco>
      <BarChart data={datos} responsive style={estiloGrafico} margin={margen} accessibilityLayer={false}>
        <CartesianGrid stroke={COLOR.superficie} vertical={false} />
        <XAxis dataKey="fecha" tickFormatter={diaCorto} minTickGap={16} {...eje} />
        <YAxis allowDecimals={false} width="auto" {...eje} />
        <Tooltip {...tooltip} labelFormatter={(f) => diaLargo(String(f))} cursor={{ fill: COLOR.superficie }} />
        <Legend formatter={leyenda} />
        <Bar dataKey="ingreso" name="Ingresos" stackId="accesos" fill={COLOR.primario} stroke={COLOR.tinta} isAnimationActive={animar} />
        <Bar dataKey="detalle" name="Vistas de casos" stackId="accesos" fill={COLOR.terciario} stroke={COLOR.tinta} isAnimationActive={animar} />
      </BarChart>
    </Marco>
  );
}
