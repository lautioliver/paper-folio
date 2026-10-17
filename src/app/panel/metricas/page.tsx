import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { CONTACT_TYPE_LABELS, CONTACT_TYPES } from "@/lib/contact";
import { diaLargo } from "@/lib/fecha-metricas";
import {
  accesosPorDia,
  consultasPorDia,
  consultasPorTipo,
  RANGOS_DIAS,
  rangoDe,
  registrosPorDia,
  totales,
  visitasPorDia,
} from "@/lib/metricas";
import { requerirRol } from "@/lib/permisos";
import {
  GraficoAccesosPorDia,
  GraficoConsultasPorDia,
  GraficoConsultasPorTipo,
  GraficoRegistrosPorDia,
  GraficoVisitasPorDia,
} from "./graficos";
import { filtrosDe, RUTA_METRICAS, rutaMetricas } from "./ruta";

export const metadata: Metadata = { title: "Métricas" };

const chip = "apretable contorno px-3 py-1 text-pequeno font-bold";

/** Un filtro como enlaces (sin estado en el cliente): la opción actual sale de la URL y lleva `aria-current`. */
function Filtro({ etiqueta, opciones }: { etiqueta: string; opciones: { href: string; texto: string; actual: boolean }[] }) {
  return (
    <nav aria-label={etiqueta} className="flex flex-wrap items-center gap-2">
      <span className="text-pequeno font-bold">{etiqueta}:</span>
      {opciones.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          scroll={false}
          aria-current={o.actual ? "page" : undefined}
          className={`${chip} ${o.actual ? "bg-primario" : "bg-papel"}`}
        >
          {o.texto}
        </Link>
      ))}
    </nav>
  );
}

/** Los datos del gráfico en una tabla: es lo que leen los lectores de pantalla (el SVG va con `aria-hidden`). */
function Tabla({ titulo, columnas, filas }: { titulo: string; columnas: string[]; filas: (string | number)[][] }) {
  return (
    <details className="mt-4 text-pequeno">
      <summary className="cursor-pointer font-bold underline">Ver los datos en una tabla</summary>
      <div className="mt-2 max-h-80 overflow-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">{titulo}</caption>
          <thead>
            <tr>
              {columnas.map((c, i) => (
                <th key={c} scope="col" className={`border-b-2 border-tinta px-2 py-1 ${i === 0 ? "text-left" : "text-right"}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={String(fila[0])}>
                {fila.map((celda, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="border-b border-superficie px-2 py-1 text-left font-normal">
                      {celda}
                    </th>
                  ) : (
                    <td key={i} className="border-b border-superficie px-2 py-1 text-right tabular-nums">
                      {celda}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Seccion({ id, titulo, resumen, children }: { id: string; titulo: string; resumen: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="contorno bg-papel p-4 sm:p-6">
      <h2 id={id} className="text-h3 font-bold">
        {titulo}
      </h2>
      <p className="mt-1 text-pequeno">{resumen}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export default async function MetricasPage({ searchParams }: PageProps<"/panel/metricas">) {
  await connection(); // Auth.js usa valores aleatorios: nada de esto se prerenderiza.
  await requerirRol(RUTA_METRICAS, "admin");
  const filtros = filtrosDe(await searchParams);
  const rango = rangoDe(filtros.dias);
  const [porTipo, porDia, registros, visitas, accesos] = await Promise.all([
    consultasPorTipo(rango),
    consultasPorDia(filtros.tipo ? { ...rango, tipo: filtros.tipo } : rango),
    registrosPorDia(rango),
    visitasPorDia(rango),
    accesosPorDia(rango),
  ]);
  const t = totales({ porTipo, registros, visitas, accesos });
  const delRango = `del ${diaLargo(rango.desde)} al ${diaLargo(rango.hasta)}`;
  const etiquetaTipo = filtros.tipo ? CONTACT_TYPE_LABELS[filtros.tipo].toLowerCase() : null;
  const totalPorDia = porDia.reduce((a, p) => a + p.total, 0);

  const tarjetas = [
    { titulo: "Consultas", valor: t.consultas },
    { titulo: "Usuarios nuevos", valor: t.registros },
    { titulo: "Visitas", valor: t.visitas },
    { titulo: "Visitantes únicos (suma diaria)", valor: t.unicos },
    { titulo: "Accesos de registrados", valor: t.accesos },
  ];

  return (
    <>
      <h1 className="text-h2 font-bold">Métricas</h1>
      <p className="mt-2 text-pequeno">
        Últimos {filtros.dias} días, {delRango} (hora de Argentina). Las visitas no cuentan a los admin ni a los bots;
        los accesos de usuarios registrados cuentan a todos los roles.
      </p>

      <div className="mt-6">
        <Filtro
          etiqueta="Rango"
          opciones={RANGOS_DIAS.map((dias) => ({
            href: rutaMetricas({ dias, tipo: filtros.tipo }),
            texto: `${dias} días`,
            actual: dias === filtros.dias,
          }))}
        />
      </div>

      <ul aria-label="Totales del rango" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tarjetas.map((c) => (
          <li key={c.titulo} className="contorno flex flex-col gap-1 bg-superficie p-4">
            <span className="text-pequeno font-bold">{c.titulo}</span>
            <span className="text-h2 font-bold tabular-nums">{c.valor}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Seccion
          id="consultas-por-tipo"
          titulo="Consultas por tipo"
          resumen={`${plural(t.consultas, "consulta", "consultas")} ${delRango}.`}
        >
          <GraficoConsultasPorTipo datos={porTipo} />
          <Tabla
            titulo="Consultas por tipo"
            columnas={["Tipo", "Consultas"]}
            filas={porTipo.map((p) => [CONTACT_TYPE_LABELS[p.tipo], p.total])}
          />
        </Seccion>

        <Seccion
          id="consultas-por-dia"
          titulo="Consultas por día"
          resumen={`${plural(totalPorDia, "consulta", "consultas")}${etiquetaTipo ? ` de tipo ${etiquetaTipo}` : ""} ${delRango}.`}
        >
          <Filtro
            etiqueta="Tipo"
            opciones={[
              { href: rutaMetricas({ dias: filtros.dias }), texto: "Todas", actual: !filtros.tipo },
              ...CONTACT_TYPES.map((tipo) => ({
                href: rutaMetricas({ dias: filtros.dias, tipo }),
                texto: CONTACT_TYPE_LABELS[tipo],
                actual: tipo === filtros.tipo,
              })),
            ]}
          />
          <div className="mt-4">
            <GraficoConsultasPorDia datos={porDia} />
          </div>
          <Tabla
            titulo={`Consultas por día${etiquetaTipo ? ` (${etiquetaTipo})` : ""}`}
            columnas={["Día", "Consultas"]}
            filas={porDia.map((p) => [diaLargo(p.fecha), p.total])}
          />
        </Seccion>

        <Seccion
          id="registros-por-dia"
          titulo="Usuarios nuevos por día"
          resumen={`${plural(t.registros, "usuario nuevo", "usuarios nuevos")} ${delRango}.`}
        >
          <GraficoRegistrosPorDia datos={registros} />
          <Tabla
            titulo="Usuarios nuevos por día"
            columnas={["Día", "Usuarios nuevos"]}
            filas={registros.map((p) => [diaLargo(p.fecha), p.total])}
          />
        </Seccion>

        <Seccion
          id="visitas-por-dia"
          titulo="Visitas y visitantes únicos por día"
          resumen={`${plural(t.visitas, "visita", "visitas")} y ${plural(t.unicos, "visitante único", "visitantes únicos")} (sumados por día) ${delRango}.`}
        >
          <GraficoVisitasPorDia datos={visitas} />
          <Tabla
            titulo="Visitas y visitantes únicos por día"
            columnas={["Día", "Visitas", "Visitantes únicos"]}
            filas={visitas.map((p) => [diaLargo(p.fecha), p.visitas, p.unicos])}
          />
        </Seccion>

        <Seccion
          id="accesos-por-dia"
          titulo="Accesos de usuarios registrados por día"
          resumen={`${plural(t.accesos, "acceso", "accesos")} ${delRango}: ingresos con Google y vistas de casos de estudio.`}
        >
          <GraficoAccesosPorDia datos={accesos} />
          <Tabla
            titulo="Accesos de usuarios registrados por día"
            columnas={["Día", "Ingresos", "Vistas de casos"]}
            filas={accesos.map((p) => [diaLargo(p.fecha), p.ingreso, p.detalle])}
          />
        </Seccion>
      </div>
    </>
  );
}
