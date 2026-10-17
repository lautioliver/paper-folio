import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/Container";
import { AVISOS_SIN_SESION, decidirIngreso, esAvisoSinSesion } from "@/lib/ingreso";
import { estadoDeSesion, vueltaDeAuthJs } from "@/lib/sesion";
import { ingresarConGoogle, ingresarConOtraCuenta, salir, salirEIngresarDeNuevo } from "@/lib/sesion-acciones";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

const BOTON = "marca apretable inline-flex min-h-11 items-center justify-center bg-tinta px-5 py-3 font-bold text-papel";

async function Ingreso({ params }: { params: PageProps<"/ingresar">["searchParams"] }) {
  const { error, callbackUrl } = await params;
  // La ruta guardada solo sirve si vino un error sin `callbackUrl` (`decidirIngreso`): si no, ni se lee.
  const leerVuelta = error !== undefined && callbackUrl === undefined;
  const [{ estado, configurado }, vueltaGuardada] = await Promise.all([
    estadoDeSesion(),
    leerVuelta ? vueltaDeAuthJs() : undefined,
  ]);
  const decision = decidirIngreso({ sesion: estado, error, callbackUrl, vueltaGuardada });
  if (decision.accion === "redirigir") redirect(decision.destino);

  if (!configurado) {
    return (
      <p role="alert" className="mt-6 text-cuerpo">
        El ingreso no está disponible en este momento. Probá de nuevo más tarde.
      </p>
    );
  }

  if (decision.aviso === "verificacion") {
    return (
      <>
        <p role="alert" className="mt-6 text-cuerpo">
          No pudimos comprobar tu sesión, probá de nuevo en un rato.
        </p>
        <form action={salir} className="mt-8">
          <button type="submit" className={BOTON}>
            Salir
          </button>
        </form>
      </>
    );
  }

  if (decision.aviso === "bloqueada") {
    return (
      <>
        <p role="alert" className="mt-6 text-cuerpo">
          Tu cuenta está bloqueada: no podés ingresar al sitio. Si creés que es un error, escribinos por el formulario
          de contacto.
        </p>
        <form action={salir} className="mt-8">
          <button type="submit" className={BOTON}>
            Salir
          </button>
        </form>
      </>
    );
  }

  if (esAvisoSinSesion(decision.aviso)) {
    const { texto, boton } = AVISOS_SIN_SESION[decision.aviso];
    return (
      <>
        <p role="alert" className="mt-6 text-cuerpo">
          {texto}
        </p>
        <form action={boton === "otra-cuenta" ? ingresarConOtraCuenta : ingresarConGoogle} className="mt-8">
          <input type="hidden" name="callbackUrl" value={decision.callbackUrl} />
          <button type="submit" className={BOTON}>
            {boton === "otra-cuenta" ? "Probar con otra cuenta" : "Continuar con Google"}
          </button>
        </form>
      </>
    );
  }

  if (decision.aviso === "sesion") {
    return (
      <>
        <p role="alert" className="mt-6 text-cuerpo">
          Tu sesión ya no es válida: tu usuario no figura en el sitio. Salí e ingresá de nuevo para seguir.
        </p>
        <form action={salirEIngresarDeNuevo} className="mt-8">
          <input type="hidden" name="callbackUrl" value={decision.callbackUrl} />
          <button type="submit" className={BOTON}>
            Salir e ingresar de nuevo
          </button>
        </form>
      </>
    );
  }

  return (
    <form action={ingresarConGoogle} className="mt-8">
      <input type="hidden" name="callbackUrl" value={decision.callbackUrl} />
      <button type="submit" className={BOTON}>
        Continuar con Google
      </button>
    </form>
  );
}

export default function IngresarPage({ searchParams }: PageProps<"/ingresar">) {
  return (
    <main className="flex flex-1 items-center">
      <Container className="py-24">
        <div className="marca max-w-md bg-papel p-8">
          <h1 className="text-h2 font-bold">Ingresar</h1>
          <p className="mt-4 text-cuerpo">Ingresá con tu cuenta de Google para ver el detalle de los proyectos y las demos.</p>
          <Suspense fallback={<p className="mt-6 text-cuerpo">Cargando…</p>}>
            <Ingreso params={searchParams} />
          </Suspense>
          <Link href="/" className="mt-8 inline-block text-pequeno font-bold underline underline-offset-4">
            Volver al inicio
          </Link>
        </div>
      </Container>
    </main>
  );
}
