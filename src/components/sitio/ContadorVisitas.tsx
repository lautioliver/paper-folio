"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { crearDeduplicador } from "@/lib/contador-visitas";

function Aviso() {
  const ruta = usePathname();
  // Una vez por cambio de ruta y por vuelta desde /ingresar o /panel (Activity), pero no dos veces por el
  // doble efecto de StrictMode: ver `crearDeduplicador`.
  const [deduplicador] = useState(crearDeduplicador);

  useEffect(() => {
    if (!deduplicador.montar(ruta)) return () => deduplicador.desmontar();
    // keepalive: el aviso llega aunque la persona cierre o cambie de página enseguida. Si falla, no pasa nada.
    fetch("/api/visitas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ruta }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
    return () => deduplicador.desmontar();
  }, [deduplicador, ruta]);

  return null;
}

/**
 * Cuenta la visita desde el navegador (épica #53, decisión 1): un POST a `/api/visitas` por carga, por cambio
 * de ruta y por vuelta al sitio desde una ruta de afuera de `(sitio)`. Como corre en un efecto, el prerender y los prefetch no cuentan. Va en Suspense porque `usePathname`
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
