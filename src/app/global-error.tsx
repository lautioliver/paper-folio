"use client";

import Link from "next/link";
import { Container } from "@/components/Container";
import "@/styles/globals.css";

// Reemplaza al layout raíz cuando falla él mismo: trae su propio <html> y los estilos globales.
// La fuente Onest la carga el layout raíz, que es lo que falló: acá `font-sans` cae a la tipografía del navegador.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="es-AR" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-papel font-sans text-tinta">
        <title>Algo salió mal</title>
        <main className="flex flex-1 items-center">
          <Container className="py-24">
            <h1 className="text-h2 font-bold">Algo salió mal</h1>
            <p className="mt-4 text-cuerpo">Probá de nuevo. Si sigue pasando, volvé en unos minutos.</p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <button type="button" onClick={() => retry()} className="marca apretable inline-flex bg-tinta px-5 py-3 font-bold text-papel">
                Probar de nuevo
              </button>
              <Link href="/" className="font-bold underline underline-offset-4">
                Volver al inicio
              </Link>
            </div>
          </Container>
        </main>
      </body>
    </html>
  );
}
