import { Contact, Footer } from "@/components/sitio/Contact";
import { Navbar } from "@/components/sitio/Navbar";
import { About, Hero, Projects, Services, Timeline } from "@/components/sitio/Sections";
import { StackBand } from "@/components/sitio/StackBand";

// Landing en el orden del manual de marca. PoC con datos públicos de GitHub (#18).
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <StackBand />
        <Services />
        <About />
        <Projects />
        <Timeline />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
