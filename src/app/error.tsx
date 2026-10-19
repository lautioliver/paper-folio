"use client";

import Link from "next/link";
import { Container } from "@/components/Container";

// Error inesperado en cualquier ruta (sitio y panel). No muestra el mensaje del error: puede traer detalles internos.
// Reemplaza a la página y a los layouts de su segmento (también el del panel): trae su propio `main` y su título.
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex flex-1 items-center">
      <Container className="py-24">
        <title>Algo salió mal</title>
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
  );
}
