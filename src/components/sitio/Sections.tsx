import Link from "next/link";
import { Container } from "@/components/Container";
import { milestones, profile } from "@/content/profile";
import { cn } from "@/lib/cn";
import { listarProyectos, listarServicios, type Proyecto } from "@/lib/contenido";
import { RUTA_PROYECTOS, rutaDemo, rutaDetalle } from "@/lib/proyectos";
import { Highlight, SectionTitle } from "./Highlight";
import { BrowserMock, HeroCharacter, IlustracionServicio, Portrait } from "./Illustrations";
import { HeroMotion } from "./HeroMotion";
import { Reveal } from "./Reveal";
import { ShareButton } from "./ShareButton";
import { PANEL_BG, TONE_BG } from "./tones";

// Botón de marca: contorno, radio y sombra (marca) más el "apretar" (apretable).
export const BUTTON = "marca apretable inline-flex items-center justify-center gap-2 px-5 py-3 text-cuerpo font-bold";

export function Hero() {
  return (
    <section id="inicio" className="pt-12 pb-16 lg:pt-20">
      <HeroMotion>
        <Container className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 data-hero className="text-[2.25rem] leading-[1.1] font-bold tracking-tight sm:text-h1 lg:text-[3.75rem]">
              Soy <Highlight tone="acento">{profile.firstName}</Highlight>, desarrollador fullstack de{" "}
              <Highlight tone="secundario">{profile.city}</Highlight>
            </h1>
            <p data-hero className="mt-6 max-w-xl text-cuerpo">{profile.intro}</p>
            <div data-hero className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#contacto" className={cn(BUTTON, "bg-tinta text-papel")}>
                Contactame
              </a>
              <a href="#proyectos" className={cn(BUTTON, "bg-papel")}>
                Ver proyectos
              </a>
            </div>
          </div>
          <div data-hero className="marca mx-auto aspect-square w-full max-w-md overflow-hidden bg-primario">
            <HeroCharacter />
          </div>
        </Container>
      </HeroMotion>
    </section>
  );
}

export async function Services() {
  const servicios = await listarServicios();
  return (
    <section id="servicios" className="py-16">
      <Container>
        <SectionTitle className="text-center">
          Mi amplio <Highlight tone="acento">set de habilidades</Highlight>
        </SectionTitle>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((servicio) => (
            <li key={servicio.titulo}>
              <Reveal className="h-full">
                <article className="contorno h-full overflow-hidden bg-papel">
                  <div className="grid place-items-center border-b-(length:--borde-marca) border-tinta bg-superficie py-6">
                    <IlustracionServicio icono={servicio.icono} imagen={servicio.imagen} />
                  </div>
                  <div className="p-6">
                    <h3 className="text-h3 font-bold">{servicio.titulo}</h3>
                    <p className="mt-2 text-pequeno">{servicio.descripcion}</p>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
          <li>
            <Reveal className="h-full">
              <article className="marca flex h-full flex-col items-start bg-primario p-6">
                <h3 className="text-h3 font-bold">¿Necesitás otra cosa?</h3>
                <p className="mt-2 mb-6 text-pequeno">
                  Si tu proyecto no entra en ninguna caja, contame la idea y vemos juntos cómo resolverla.
                </p>
                <a href="#contacto" className={cn(BUTTON, "mt-auto bg-tinta text-papel")}>
                  Escribime
                </a>
              </article>
            </Reveal>
          </li>
        </ul>
      </Container>
    </section>
  );
}


export async function About() {
  const proyectos = await listarProyectos();
  return (
    <section id="sobre-mi" className="py-16">
      <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
        <Reveal className="mx-auto w-full max-w-sm">
          <Portrait />
        </Reveal>
        <div>
          <SectionTitle>
            ¿Quién está detrás de <Highlight tone="secundario">todo esto?</Highlight>
          </SectionTitle>
          <p className="mt-6 text-cuerpo">{profile.about}</p>
          <p className="mt-2 text-pequeno">{profile.role}.</p>
          <ul className="mt-6 flex flex-wrap gap-6 text-pequeno font-bold">
            <li className="flex items-center gap-2">
              <span className="size-4 rounded-sm border-2 border-tinta bg-acento" />
              En GitHub desde {profile.githubSince}
            </li>
            <li className="flex items-center gap-2">
              <span className="size-4 rounded-sm border-2 border-tinta bg-secundario" />
              {proyectos.length} proyectos públicos en producción
            </li>
          </ul>
          <a href={profile.githubUrl} target="_blank" rel="noreferrer" className={cn(BUTTON, "mt-8 bg-tinta text-papel")}>
            Ver mi GitHub
          </a>
        </div>
      </Container>
    </section>
  );
}

/** Tarjeta de un proyecto: la usan la landing y el listado `/proyectos`. */
export function ProjectCard({ project }: { project: Proyecto }) {
  return (
    <Reveal>
      <article className="contorno grid overflow-hidden bg-papel lg:grid-cols-2">
        <div className="order-2 p-6 sm:p-8 lg:order-1">
          <span
            className={cn(
              "grid size-11 place-items-center rounded-lg border-2 border-tinta text-h3 font-bold",
              TONE_BG[project.acento],
            )}
            aria-hidden="true"
          >
            {project.inicial}
          </span>
          <p className="mt-4 inline-block rounded-md bg-tinta px-2 py-0.5 text-xs font-bold text-papel">
            {project.categoria}
          </p>
          <h3 className="mt-3 text-h3 font-bold">{project.nombre}</h3>
          <p className="mt-2 text-pequeno">{project.descripcion}</p>
          <p className="mt-3 text-xs font-bold">{project.stack.join(" · ")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-pequeno font-bold">
            {/* Detalle y demo solo para registrados: sin prefetch, así no se pide la ruta protegida antes de un clic. */}
            <Link
              href={rutaDetalle(project.slug)}
              prefetch={false}
              className={cn(BUTTON, "bg-tinta px-4 py-2 text-papel")}
            >
              Ver caso de estudio
            </Link>
            {/* La demo también es solo para registrados: pasa por el ingreso y vuelve al detalle. */}
            {project.tieneDemo && (
              <Link href={rutaDemo(project.slug)} prefetch={false} className="underline decoration-2 underline-offset-4">
                Ver demo →
              </Link>
            )}
            <a href={project.repoUrl} target="_blank" rel="noreferrer" className="underline decoration-2 underline-offset-4">
              Ver en GitHub →
            </a>
            <ShareButton title={project.nombre} slug={project.slug} />
          </div>
        </div>
        <div
          className={cn(
            "order-1 grid place-items-center border-b-(length:--borde-marca) border-tinta p-8 lg:order-2 lg:border-b-0 lg:border-l-(length:--borde-marca)",
            PANEL_BG[project.acento],
          )}
        >
          <BrowserMock tone={project.acento} />
        </div>
      </article>
    </Reveal>
  );
}

export async function Projects() {
  const proyectos = await listarProyectos();
  return (
    <section id="proyectos" className="py-16">
      <Container>
        <SectionTitle className="text-center">
          Mirá mis <Highlight tone="primario">proyectos destacados</Highlight>
        </SectionTitle>
        <ul className="mt-12 grid gap-8">
          {proyectos.map((project) => (
            <li key={project.slug} id={`proyecto-${project.slug}`} className="scroll-mt-28">
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
        <div className="mt-10 text-center">
          <Link href={RUTA_PROYECTOS} className={cn(BUTTON, "bg-papel")}>
            Ver todos los proyectos
          </Link>
        </div>
      </Container>
    </section>
  );
}

export function Timeline() {
  return (
    <section id="trayectoria" className="zona-oscura bg-tinta py-20 text-papel">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <SectionTitle>
            Mirá mi <Highlight tone="terciario">trayectoria</Highlight>
          </SectionTitle>
          <p className="mt-6 max-w-sm text-cuerpo">
            Cada proyecto empezó como un problema real: de la facu, del campus o de cómo trabajo con agentes.
          </p>
        </div>
        <ol className="grid gap-5">
          {milestones.map((milestone) => (
            <li key={milestone.title}>
              <Reveal>
                <article className="rounded-marca bg-papel p-6 text-tinta">
                  <p className="text-pequeno font-bold">{milestone.date}</p>
                  <hr className="my-3 border-t-2 border-tinta" />
                  <h3 className="text-cuerpo font-bold">{milestone.title}</h3>
                  <p className="mt-1 text-pequeno">{milestone.description}</p>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
