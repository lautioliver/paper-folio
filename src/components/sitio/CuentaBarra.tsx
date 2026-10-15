import { Suspense } from "react";
import { sesionParaLaBarra } from "@/lib/sesion";
import { EnlaceIngresar, LugarDeCuenta, MenuCuenta } from "./MenuCuenta";

async function Sesion() {
  const sesion = await sesionParaLaBarra();
  if (!sesion?.user?.id) return <EnlaceIngresar />;
  const { name, email, image, rol } = sesion.user;
  return <MenuCuenta nombre={name || email || "Mi cuenta"} imagen={image ?? null} rol={rol} />;
}

/**
 * La sesión en la barra: "Ingresar" o el menú de la cuenta. Leer la sesión vuelve dinámico este tramo,
 * por eso va en Suspense: el resto de la página se sigue prerenderizando.
 */
export function CuentaBarra() {
  return (
    <Suspense fallback={<LugarDeCuenta />}>
      <Sesion />
    </Suspense>
  );
}
