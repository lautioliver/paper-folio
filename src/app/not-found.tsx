import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";

export const metadata: Metadata = { title: "Página no encontrada" };

// 404 de `notFound()` y de cualquier URL que no existe.
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center">
      <Container className="py-24">
        <h1 className="text-h2 font-bold">Página no encontrada</h1>
        <p className="mt-4 text-cuerpo">Puede que el enlace sea viejo o que el proyecto ya no esté publicado.</p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Link href="/" className="marca apretable inline-flex bg-tinta px-5 py-3 font-bold text-papel">
            Volver al inicio
          </Link>
          <Link href="/proyectos" className="font-bold underline underline-offset-4">
            Ver los proyectos
          </Link>
        </div>
      </Container>
    </main>
  );
}
