import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Footer } from "@/components/sitio/Contact";
import { CuentaBarra } from "@/components/sitio/CuentaBarra";
import { Highlight } from "@/components/sitio/Highlight";
import { Navbar } from "@/components/sitio/Navbar";
import { ProjectCard } from "@/components/sitio/Sections";
import { projects } from "@/content/profile";

export const metadata: Metadata = {
  title: "Proyectos",
  description: "Todos los proyectos públicos. Para ver el caso de estudio y la demo hace falta registrarse.",
};

// Listado público: las tarjetas enlazan al detalle, que pide sesión (`/proyectos/[slug]`).
export default function ProyectosPage() {
  return (
    <>
      <Navbar cuenta={<CuentaBarra />} />
      <main className="flex-1 pb-16">
        <div className="py-6">
          <Container>
            <Link href="/" className="text-pequeno font-bold underline decoration-2 underline-offset-4">
              ← Volver al inicio
            </Link>
          </Container>
        </div>
        <Container>
          <h1 className="text-center text-[1.75rem] leading-[1.15] font-bold sm:text-h2">
            Todos mis <Highlight tone="primario">proyectos</Highlight>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-cuerpo">
            El caso de estudio y la demo de cada uno son para usuarios registrados: ingresás con Google, en un clic.
          </p>
          <ul className="mt-12 grid gap-8">
            {projects.map((project) => (
              <li key={project.slug}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        </Container>
      </main>
      <Footer />
    </>
  );
}
