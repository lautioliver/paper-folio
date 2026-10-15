import Link from "next/link";
import { Container } from "@/components/Container";

// 403 de `forbidden()` (src/lib/permisos.ts): hay sesión, pero el rol no alcanza.
export default function Forbidden() {
  return (
    <main className="flex flex-1 items-center">
      <Container className="py-24">
        <h1 className="text-h2 font-bold">No tenés permiso para ver esta página</h1>
        <p className="mt-4 text-cuerpo">Si creés que es un error, pedile acceso a quien administra el sitio.</p>
        <Link href="/" className="marca apretable mt-8 inline-flex bg-tinta px-5 py-3 font-bold text-papel">
          Volver al inicio
        </Link>
      </Container>
    </main>
  );
}
