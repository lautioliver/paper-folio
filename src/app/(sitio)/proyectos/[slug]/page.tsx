import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Container } from "@/components/Container";
import { Footer } from "@/components/sitio/Contact";
import { CuentaBarra } from "@/components/sitio/CuentaBarra";
import { Highlight } from "@/components/sitio/Highlight";
import { Navbar } from "@/components/sitio/Navbar";
import { BUTTON } from "@/components/sitio/Sections";
import { TONE_BG } from "@/components/sitio/tones";
import { cn } from "@/lib/cn";
import { detalleProyecto, type Demo } from "@/lib/contenido";
import { esUrlHttps } from "@/lib/contenido-esquemas";
import { demoEmbebible, origenDelPedido } from "@/lib/embebible";
import { requerirSesion } from "@/lib/permisos";
import { RUTA_PROYECTOS, rutaDetalle } from "@/lib/proyectos";

// Contenido para registrados: que los buscadores no lo indexen.
export const metadata: Metadata = { title: "Caso de estudio", robots: { index: false, follow: false } };

// Detalle solo para registrados. `proxy.ts` redirige antes de renderizar, pero el control real es `requerirSesion`.
export default function DetallePage({ params }: PageProps<"/proyectos/[slug]">) {
  return (
    <>
      <Navbar cuenta={<CuentaBarra />} />
      <main className="flex-1 pb-16">
        <div className="py-6">
          <Container>
            <Link href={RUTA_PROYECTOS} className="text-pequeno font-bold underline decoration-2 underline-offset-4">
              ← Todos los proyectos
            </Link>
          </Container>
        </div>
        <Suspense fallback={<Container><p className="text-cuerpo">Cargando…</p></Container>}>
          <Detalle params={params} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

async function Detalle({ params }: { params: PageProps<"/proyectos/[slug]">["params"] }) {
  const { slug } = await params;
  // Primero la sesión: sin ella nadie ve nada, ni siquiera si el slug existe.
  await requerirSesion(rutaDetalle(slug));
  // Solo lo publicado: un proyecto despublicado (o inexistente) da 404. Proyecto y demos en una sola
  // lectura, así no se mezclan la base y el respaldo estático.
  const detalle = await detalleProyecto(slug);
  if (!detalle) notFound();
  const { proyecto: project, demos } = detalle;
  const { caso } = project;
  const [principal] = demos;

  return (
    <Container className="grid gap-10">
      <div>
        <span
          className={cn(
            "grid size-12 place-items-center rounded-lg border-2 border-tinta text-h3 font-bold",
            TONE_BG[project.acento],
          )}
          aria-hidden="true"
        >
          {project.inicial}
        </span>
        <p className="mt-4 inline-block rounded-md bg-tinta px-2 py-0.5 text-xs font-bold text-papel">
          {project.categoria}
        </p>
        <h1 className="mt-3 text-h2 font-bold">
          <Highlight tone={project.acento}>{project.nombre}</Highlight>
        </h1>
        <p className="mt-4 max-w-2xl text-cuerpo">{project.descripcion}</p>
        <div className="mt-6 flex flex-wrap gap-4">
          {principal && (
            <a href={principal.url} target="_blank" rel="noreferrer" className={cn(BUTTON, "bg-tinta text-papel")}>
              Abrir demo en otra pestaña
            </a>
          )}
          <a href={project.repoUrl} target="_blank" rel="noreferrer" className={cn(BUTTON, "bg-papel")}>
            Ver en GitHub
          </a>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="problema" className="contorno bg-papel p-6">
          <h2 id="problema" className="text-h3 font-bold">El problema</h2>
          <p className="mt-2 text-cuerpo">{caso.problema}</p>
        </section>
        <section aria-labelledby="solucion" className="contorno bg-papel p-6">
          <h2 id="solucion" className="text-h3 font-bold">La solución</h2>
          <p className="mt-2 text-cuerpo">{caso.solucion}</p>
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="funcionalidades">
          <h2 id="funcionalidades" className="text-h3 font-bold">Funcionalidades</h2>
          <ul className="mt-3 grid list-disc gap-2 pl-5 text-cuerpo">
            {caso.funcionalidades.map((funcionalidad) => (
              <li key={funcionalidad}>{funcionalidad}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="stack">
          <h2 id="stack" className="text-h3 font-bold">Stack</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {caso.stack.map((tecnologia) => (
              <li key={tecnologia} className="rounded-md border-2 border-tinta bg-papel px-2 py-0.5 text-pequeno font-bold">
                {tecnologia}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="demo">
        <h2 id="demo" className="text-h3 font-bold">Demo</h2>
        {demos.length === 0 ? (
          <p className="mt-2 text-cuerpo">Este proyecto todavía no tiene una demo publicada.</p>
        ) : (
          <div className="grid gap-10">
            {demos.map((demo, i) => (
              <VistaDemo key={`${i}-${demo.url}`} demo={demo} conTitulo={demos.length > 1} />
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}

/**
 * Una demo: el sitio en un iframe con sandbox y, aparte, el enlace para abrirlo en otra pestaña. Si la demo no
 * se deja embeber (#61), solo el botón: un iframe así queda como un recuadro vacío.
 */
function VistaDemo({ demo, conTitulo }: { demo: Demo; conTitulo: boolean }) {
  return (
    <div>
      {conTitulo && <h3 className="mt-2 text-cuerpo font-bold">{demo.titulo}</h3>}
      {demo.descripcion && <p className="mt-2 text-cuerpo">{demo.descripcion}</p>}
      {/* Una demo http no se embebe: el navegador la bloquea como contenido mixto. Queda el enlace. */}
      {esUrlHttps(demo.url) ? (
        <Suspense
          fallback={
            <p className="mt-2 text-pequeno">
              Cargando la demo… <EnlaceDemo url={demo.url} />.
            </p>
          }
        >
          <MarcoDemo demo={demo} />
        </Suspense>
      ) : (
        <p className="mt-2 text-pequeno">
          Esta demo no usa https, así que no se puede mostrar acá: <EnlaceDemo url={demo.url} />.
        </p>
      )}
    </div>
  );
}

function EnlaceDemo({
  url,
  className = "font-bold underline decoration-2 underline-offset-4",
  children = "Abrir en otra pestaña",
}: {
  url: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}

/**
 * El iframe, salvo que las cabeceras de la demo lo impidan (`demoEmbebible`, cacheada). Si no se pudo saber
 * (la demo no respondió a tiempo), se muestra el iframe con el aviso, como antes de #61.
 */
async function MarcoDemo({ demo }: { demo: Demo }) {
  // El origen del pedido: es el que el navegador usa para el iframe (producción, un preview, localhost).
  const embebible = await demoEmbebible(demo.url, origenDelPedido(await headers()));
  if (embebible === "no") {
    return (
      <div className="mt-2">
        <p className="text-pequeno">Este sitio no permite mostrarse dentro de otra página.</p>
        <EnlaceDemo url={demo.url} className={cn(BUTTON, "mt-4 bg-tinta text-papel")}>
          Abrir demo
        </EnlaceDemo>
      </div>
    );
  }
  return (
    <>
      <p className="mt-2 text-pequeno">
        Si el sitio no se ve acá (algunos no permiten mostrarse dentro de otra página), abrilo en otra pestaña:{" "}
        <EnlaceDemo url={demo.url} />.
      </p>
      <iframe
        src={demo.url}
        title={demo.titulo}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        loading="lazy"
        referrerPolicy="no-referrer"
        className="marca mt-4 h-[32rem] w-full bg-papel"
      />
    </>
  );
}
