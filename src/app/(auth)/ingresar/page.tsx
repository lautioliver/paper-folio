import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/Container";
import { decidirIngreso, type AvisoIngreso } from "@/lib/ingreso";
import { estadoDeSesion, vueltaDeAuthJs } from "@/lib/sesion";
import { ingresarConGoogle, ingresarConOtraCuenta, salir, salirEIngresarDeNuevo } from "@/lib/sesion-acciones";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

// Los avisos con sesión tienen su propia pantalla; todos los demás tienen que estar en AVISOS_SIN_SESION.
type AvisoSinSesion = Exclude<AvisoIngreso, "sesion" | "bloqueada" | "verificacion" | null>;

// Avisos sin sesión, según el `error` de la URL (`decidirIngreso`): el texto es siempre uno de estos, nunca el de
// la URL. `boton`: "google" reintenta con la misma cuenta; "otra-cuenta" abre el selector de cuentas de Google;
// null no ofrece reintentar (Configuration: una falla del sitio, que reintentar en seguida no tiene por qué arreglar).
const AVISOS_SIN_SESION = {
  "ingreso-bloqueado": {
    texto:
      "Esa cuenta está bloqueada: no puede ingresar al sitio. Si creés que es un error, escribinos por el formulario de contacto.",
    boton: "otra-cuenta",
  },
  denegado: {
    texto:
      "No pudimos dejarte ingresar: la cuenta de Google tiene que tener el email verificado. Si creés que es un error, escribinos por el formulario de contacto.",
    boton: "otra-cuenta",
  },
  reintentar: { texto: "No pudimos verificar tu cuenta. Probá de nuevo en un rato.", boton: "google" },
  google: { texto: "No se completó el ingreso con Google. Si lo cancelaste, podés probar de nuevo.", boton: "google" },
  "cuenta-no-vinculada": {
    texto: "Ese email ya se usó para ingresar de otra forma. Probá con otra cuenta de Google.",
    boton: "otra-cuenta",
  },
  vencido: { texto: "El ingreso venció antes de terminar. Probá de nuevo.", boton: "google" },
  configuracion: {
    texto:
      "El ingreso no está disponible por un problema del sitio. Probá más tarde y, si sigue pasando, escribinos por el formulario de contacto.",
    boton: null,
  },
  generico: { texto: "No pudimos completar el ingreso. Probá de nuevo.", boton: "google" },
} as const satisfies Record<AvisoSinSesion, { texto: string; boton: "google" | "otra-cuenta" | null }>;

function esAvisoSinSesion(aviso: AvisoIngreso): aviso is AvisoSinSesion {
  return aviso !== null && Object.hasOwn(AVISOS_SIN_SESION, aviso);
}

const BOTON = "marca apretable inline-flex min-h-11 items-center justify-center bg-tinta px-5 py-3 font-bold text-papel";

async function Ingreso({ params }: { params: PageProps<"/ingresar">["searchParams"] }) {
  const { error, callbackUrl } = await params;
  const [{ estado, configurado }, vueltaGuardada] = await Promise.all([estadoDeSesion(), vueltaDeAuthJs()]);
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
        {boton && (
          <form action={boton === "otra-cuenta" ? ingresarConOtraCuenta : ingresarConGoogle} className="mt-8">
            <input type="hidden" name="callbackUrl" value={decision.callbackUrl} />
            <button type="submit" className={BOTON}>
              {boton === "otra-cuenta" ? "Probar con otra cuenta" : "Continuar con Google"}
            </button>
          </form>
        )}
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
