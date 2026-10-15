import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/Container";
import { Footer } from "@/components/sitio/Contact";
import { CuentaBarra } from "@/components/sitio/CuentaBarra";
import { Highlight } from "@/components/sitio/Highlight";
import { Navbar } from "@/components/sitio/Navbar";
import { BUTTON } from "@/components/sitio/Sections";
import { TONE_BG } from "@/components/sitio/tones";
import { cn } from "@/lib/cn";
import { requerirSesion } from "@/lib/permisos";
import { buscarProyecto, RUTA_PROYECTOS, rutaDetalle } from "@/lib/proyectos";

// Contenido para registrados: que los buscadores no lo indexen.
export const metadata: Metadata = { title: "Caso de estudio", robots: { index: false, follow: false } };

// Detalle solo para registrados. `proxy.ts` redirige antes de renderizar, pero el control real es `requerirSesion`.
export default function DetallePage({ params }: PageProps<"/proyectos/[slug]">) {
  return (
    <>
      <Navbar cuenta={<CuentaBarra />} />
      <div className="py-6">
        <Container>
          <Link href={RUTA_PROYECTOS} className="text-pequeno font-bold underline decoration-2 underline-offset-4">
            ← Todos los proyectos
          </Link>
        </Container>
      </div>
      <main className="flex-1 pb-16">
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
  const project = buscarProyecto(slug);
  if (!project) notFound();
  const { caso } = project;

  return (
    <Container className="grid gap-10">
      <div>
        <span
          className={cn(
            "grid size-12 place-items-center rounded-lg border-2 border-tinta text-h3 font-bold",
            TONE_BG[project.accent],
          )}
          aria-hidden="true"
        >
          {project.initial}
        </span>
        <p className="mt-4 inline-block rounded-md bg-tinta px-2 py-0.5 text-xs font-bold text-papel">
          {project.category}
        </p>
        <h1 className="mt-3 text-h2 font-bold">
          <Highlight tone={project.accent}>{project.name}</Highlight>
        </h1>
        <p className="mt-4 max-w-2xl text-cuerpo">{project.description}</p>
        <div className="mt-6 flex flex-wrap gap-4">
          <a href={project.demoUrl} target="_blank" rel="noreferrer" className={cn(BUTTON, "bg-tinta text-papel")}>
            Abrir demo en otra pestaña
          </a>
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
        <p className="mt-2 text-pequeno">
          Si el sitio no se ve acá (algunos no permiten mostrarse dentro de otra página), abrilo en otra pestaña:{" "}
          <a
            href={project.demoUrl}
            target="_blank"
            rel="noreferrer"
            className="font-bold underline decoration-2 underline-offset-4"
          >
            Abrir en otra pestaña
          </a>
          .
        </p>
        <iframe
          src={project.demoUrl}
          title={`Demo de ${project.name}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          loading="lazy"
          referrerPolicy="no-referrer"
          className="marca mt-4 h-[32rem] w-full bg-papel"
        />
      </section>
    </Container>
  );
}
