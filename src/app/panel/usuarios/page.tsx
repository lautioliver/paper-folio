import Link from "next/link";
import { connection } from "next/server";
import { requerirRol } from "@/lib/permisos";
import { listarUsuarios, type UsuarioAdmin } from "@/lib/usuarios-admin";
import { ROLES, type Rol } from "@/models/Usuario";
import { cambiarBloqueoAccion, cambiarRolAccion } from "./acciones";
import { avisoDe, filtrosDe, LARGO_BUSQUEDA, RUTA_USUARIOS, rutaUsuarios } from "./ruta";

const fecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});
const ETIQUETA_ROL: Record<Rol, string> = { usuario: "Usuario", operador: "Operador", admin: "Admin" };
const boton = "apretable contorno bg-papel px-3 py-1 text-pequeno font-bold";
const campo = "contorno bg-papel px-3 py-2 text-pequeno";

function Fecha({ valor }: { valor: Date | null }) {
  return valor ? <time dateTime={valor.toISOString()}>{fecha.format(valor)}</time> : <span>—</span>;
}

// Las acciones son botones sueltos (sin selects ni campos con valor inicial): después de cada una se vuelve a
// la lista renderizada en el servidor, así el DOM que Next conserva de una visita anterior nunca muestra
// un rol o un estado viejo. La búsqueda y la página viajan ocultas para volver al mismo lugar.
function Acciones({ u, propio, q, pagina }: { u: UsuarioAdmin; propio: boolean; q: string; pagina: number }) {
  if (propio) return <p className="text-pequeno">Es tu cuenta: no podés cambiarte el rol ni bloquearte.</p>;
  const ocultos = (
    <>
      <input type="hidden" name="q" value={q} />
      <input type="hidden" name="pagina" value={pagina} />
    </>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!u.porEntorno &&
        ROLES.filter((r) => r !== u.rol).map((r) => (
          <form key={r} action={cambiarRolAccion.bind(null, u.id, r)}>
            {ocultos}
            <button type="submit" className={boton} aria-label={`Hacer ${ETIQUETA_ROL[r].toLowerCase()} a ${u.email}`}>
              Hacer {ETIQUETA_ROL[r].toLowerCase()}
            </button>
          </form>
        ))}
      {(!u.porEntorno || u.bloqueado) && (
        <form action={cambiarBloqueoAccion.bind(null, u.id, !u.bloqueado)}>
          {ocultos}
          <button
            type="submit"
            className={`${boton} ${u.bloqueado ? "" : "bg-acento"}`}
            aria-label={`${u.bloqueado ? "Desbloquear" : "Bloquear"} a ${u.email}`}
          >
            {u.bloqueado ? "Desbloquear" : "Bloquear"}
          </button>
        </form>
      )}
      {u.porEntorno && <p className="text-pequeno">Está en ADMIN_EMAILS: es admin siempre.</p>}
    </div>
  );
}

export default async function UsuariosPage({ searchParams }: PageProps<"/panel/usuarios">) {
  await connection(); // Auth.js usa valores aleatorios: nada de esto se prerenderiza.
  const { id: actor } = await requerirRol(RUTA_USUARIOS, "admin");
  const params = await searchParams;
  const filtros = filtrosDe(params);
  const { usuarios, total, pagina, paginas } = await listarUsuarios(filtros);
  const aviso = avisoDe(params.aviso);

  return (
    <>
      <h1 className="text-h2 font-bold">Usuarios</h1>
      <p className="mt-2 text-pequeno">
        {total === 1 ? "1 usuario" : `${total} usuarios`}
        {filtros.q ? " con esa búsqueda" : ""}, del más nuevo al más viejo. Un cambio de rol o un bloqueo vale al
        instante, también en las sesiones abiertas.
      </p>

      {aviso && (
        <p
          role={aviso.tipo === "error" ? "alert" : "status"}
          className={`contorno mt-6 p-4 text-pequeno font-bold ${aviso.tipo === "error" ? "bg-acento" : "bg-primario"}`}
        >
          {aviso.mensaje}
        </p>
      )}

      <form method="get" action={RUTA_USUARIOS} role="search" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-pequeno font-bold">
          Buscar por nombre o email
          {/* `key`: si la URL cambia (otra búsqueda, "Quitar búsqueda"), el campo se vuelve a montar con ella. */}
          <input key={filtros.q} type="search" name="q" defaultValue={filtros.q} maxLength={LARGO_BUSQUEDA} className={campo} />
        </label>
        <button type="submit" className="marca apretable bg-tinta px-5 py-2 text-pequeno font-bold text-papel">
          Buscar
        </button>
        {filtros.q && (
          <Link href={RUTA_USUARIOS} className="py-2 text-pequeno font-bold underline">
            Quitar búsqueda
          </Link>
        )}
      </form>

      {usuarios.length === 0 ? (
        <p className="contorno mt-8 bg-superficie p-8 text-center">
          {filtros.q ? "No hay usuarios con esa búsqueda." : "Todavía no ingresó nadie."}
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {usuarios.map((u) => (
            <li key={u.id} className="contorno flex flex-col gap-3 bg-papel p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-bold break-words">{u.nombre || "Sin nombre"}</span>
                <span className="text-pequeno break-all">{u.email}</span>
                <span className="contorno bg-superficie px-2 text-pequeno font-bold">{ETIQUETA_ROL[u.rol]}</span>
                {u.bloqueado && <span className="contorno bg-acento px-2 text-pequeno font-bold">Bloqueado</span>}
                {u.id === actor && <span className="text-pequeno font-bold">(vos)</span>}
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-pequeno sm:grid-cols-3">
                <div className="flex gap-2">
                  <dt className="font-bold">Alta:</dt>
                  <dd>
                    <Fecha valor={u.creadoEn} />
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-bold">Último acceso:</dt>
                  <dd>
                    <Fecha valor={u.ultimoAcceso} />
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-bold">Accesos:</dt>
                  <dd>{u.accesos}</dd>
                </div>
              </dl>
              <Acciones u={u} propio={u.id === actor} q={filtros.q} pagina={pagina} />
            </li>
          ))}
        </ul>
      )}

      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-8 flex items-center justify-between gap-4 text-pequeno font-bold">
          {pagina > 1 ? (
            <Link href={rutaUsuarios({ q: filtros.q, pagina: pagina - 1 })} className="underline">
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span>
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link href={rutaUsuarios({ q: filtros.q, pagina: pagina + 1 })} className="underline">
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
