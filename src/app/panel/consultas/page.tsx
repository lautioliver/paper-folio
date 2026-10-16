import Link from "next/link";
import { connection } from "next/server";
import { ChipEstado } from "@/components/panel/ChipEstado";
import {
  listarConsultas,
  parsearFiltros,
  type FiltrosValidos,
} from "@/lib/bandeja";
import { ESTADOS_CONSULTA, ETIQUETAS_ESTADO } from "@/lib/estados-consulta";
import { CONTACT_TYPE_LABELS, CONTACT_TYPES } from "@/lib/contact";
import { requerirRol } from "@/lib/permisos";

const RUTA = "/panel/consultas";
const fecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

function enlace(filtros: FiltrosValidos, pagina: number): string {
  const q = new URLSearchParams();
  if (filtros.tipo) q.set("tipo", filtros.tipo);
  if (filtros.estado) q.set("estado", filtros.estado);
  if (pagina > 1) q.set("pagina", String(pagina));
  const s = q.toString();
  return s ? `${RUTA}?${s}` : RUTA;
}

const campo = "contorno bg-papel px-3 py-2 text-pequeno";

export default async function ConsultasPage({
  searchParams,
}: PageProps<"/panel/consultas">) {
  await connection(); // Auth.js usa valores aleatorios: nada de esto se prerenderiza.
  await requerirRol(RUTA, "operador", "admin");
  const filtros = parsearFiltros(await searchParams);
  const { items, total, paginas, pagina } = await listarConsultas(filtros);
  const activos = { ...filtros, pagina };

  return (
    <>
      <h1 className="text-h2 font-bold">Consultas</h1>
      <p className="mt-2 text-pequeno">
        {total === 1 ? "1 consulta" : `${total} consultas`}, de la más nueva a
        la más vieja.
      </p>

      <form
        method="get"
        action={RUTA}
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <label className="flex flex-col gap-1 text-pequeno font-bold">
          Tipo
          <select
            name="tipo"
            defaultValue={filtros.tipo ?? ""}
            className={campo}
          >
            <option value="">Todos</option>
            {CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONTACT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-pequeno font-bold">
          Estado
          <select
            name="estado"
            defaultValue={filtros.estado ?? ""}
            className={campo}
          >
            <option value="">Todos</option>
            {ESTADOS_CONSULTA.map((e) => (
              <option key={e} value={e}>
                {ETIQUETAS_ESTADO[e]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="marca apretable bg-tinta px-5 py-2 text-pequeno font-bold text-papel"
        >
          Filtrar
        </button>
        {(filtros.tipo || filtros.estado) && (
          <Link href={RUTA} className="py-2 text-pequeno font-bold underline">
            Quitar filtros
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <p className="contorno mt-8 bg-superficie p-8 text-center">
          {filtros.tipo || filtros.estado
            ? "No hay consultas con esos filtros."
            : "Todavía no llegó ninguna consulta."}
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {items.map((c) => (
            <li key={c.id} className="contorno bg-papel p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  href={`${RUTA}/${c.id}`}
                  className="font-bold underline decoration-2 underline-offset-4"
                >
                  {c.nombre}
                </Link>
                <ChipEstado estado={c.estado} />
                <span className="text-pequeno">
                  {CONTACT_TYPE_LABELS[c.tipo]}
                </span>
                <time
                  dateTime={c.creadaEn.toISOString()}
                  className="text-pequeno sm:ml-auto"
                >
                  {fecha.format(c.creadaEn)}
                </time>
              </div>
              <p className="mt-2 text-pequeno break-words">{c.extracto}</p>
            </li>
          ))}
        </ul>
      )}

      {paginas > 1 && (
        <nav
          aria-label="Páginas"
          className="mt-8 flex items-center justify-between gap-4 text-pequeno font-bold"
        >
          {pagina > 1 ? (
            <Link href={enlace(activos, pagina - 1)} className="underline">
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span>
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link href={enlace(activos, pagina + 1)} className="underline">
              Siguiente
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
