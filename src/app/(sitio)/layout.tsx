import { ContadorVisitas } from "@/components/sitio/ContadorVisitas";
import { ProgresoLectura } from "@/components/sitio/ProgresoLectura";

// Layout del sitio público: cuenta las visitas desde el navegador (#55). El panel y /ingresar no pasan por acá.
export default function SitioLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <ProgresoLectura />
      <ContadorVisitas />
      {children}
    </>
  );
}
