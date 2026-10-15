import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { Container } from "@/components/Container";
import { CuentaBarra } from "@/components/sitio/CuentaBarra";
import { Navbar } from "@/components/sitio/Navbar";
import { requerirSesion } from "@/lib/permisos";
import { salir } from "@/lib/sesion-acciones";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

const ROLES = { usuario: "Usuario", operador: "Operador", admin: "Administrador" } as const;

async function Datos() {
  await connection(); // Auth.js usa valores al azar: sin esto el prerender los toma por una lectura estática.
  // Redirige a /ingresar sin sesión o con sesión huérfana; el rol sale de la base, no del token.
  const { rol } = await requerirSesion("/cuenta");
  const usuario = (await auth())?.user;
  return (
    <>
      <dl className="mt-8 grid max-w-md gap-4 text-cuerpo">
        <div>
          <dt className="text-pequeno font-bold">Nombre</dt>
          <dd>{usuario?.name || "Sin nombre"}</dd>
        </div>
        <div>
          <dt className="text-pequeno font-bold">Email</dt>
          <dd className="break-all">{usuario?.email}</dd>
        </div>
        <div>
          <dt className="text-pequeno font-bold">Rol</dt>
          <dd>{ROLES[rol]}</dd>
        </div>
      </dl>
      <form action={salir} className="mt-8">
        <button
          type="submit"
          className="marca apretable inline-flex min-h-11 items-center bg-tinta px-5 py-3 font-bold text-papel"
        >
          Salir
        </button>
      </form>
    </>
  );
}

export default function CuentaPage() {
  return (
    <>
      <Navbar cuenta={<CuentaBarra />} />
      <main className="flex-1">
        <Container className="py-16">
          <h1 className="text-h2 font-bold">Mi cuenta</h1>
          <Suspense fallback={<p className="mt-8 text-cuerpo">Cargando…</p>}>
            <Datos />
          </Suspense>
        </Container>
      </main>
    </>
  );
}
