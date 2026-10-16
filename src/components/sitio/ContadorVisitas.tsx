"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

function Aviso() {
  const ruta = usePathname();
  // StrictMode (dev) corre el efecto dos veces en el montaje: la ref evita contar dos veces la misma carga.
  const ultima = useRef<string | null>(null);

  useEffect(() => {
    if (ultima.current === ruta) return;
    ultima.current = ruta;
    // keepalive: el aviso llega aunque la persona cierre o cambie de página enseguida. Si falla, no pasa nada.
    fetch("/api/visitas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ruta }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  }, [ruta]);

  return null;
}

/**
 * Cuenta la visita desde el navegador (épica #53, decisión 1): un POST a `/api/visitas` por carga y por cambio
 * de ruta. Como corre en un efecto, el prerender y los prefetch no cuentan. Va en Suspense porque `usePathname`
 * suspende en las rutas con parámetros que no se conocen al compilar (`/proyectos/[slug]`): así el resto del
 * layout se sigue prerenderizando.
 */
export function ContadorVisitas() {
  return (
    <Suspense fallback={null}>
      <Aviso />
    </Suspense>
  );
}
