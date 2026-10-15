import { Container } from "@/components/Container";
import { siteConfig } from "@/lib/site";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center">
      <Container className="py-24">
        <h1 className="text-5xl font-bold tracking-tight">{siteConfig.name}</h1>
        <p className="mt-4 text-lg">{siteConfig.description}</p>
      </Container>
    </main>
  );
}
