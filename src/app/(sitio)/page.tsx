import { Container } from "@/components/Container";
import { siteConfig } from "@/lib/site";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center">
      <Container className="py-24">
        <h1 className="inline-block bg-primario px-3 py-1 text-h1 font-bold text-tinta border-(length:--borde-marca) border-tinta rounded-marca shadow-marca">
          {siteConfig.name}
        </h1>
        <p className="mt-4 text-cuerpo text-tinta">{siteConfig.description}</p>
        <button
          type="button"
          className="mt-8 bg-acento px-5 py-2 text-cuerpo font-bold text-tinta border-(length:--borde-marca) border-tinta rounded-marca shadow-marca"
        >
          Ver proyectos
        </button>
      </Container>
    </main>
  );
}
