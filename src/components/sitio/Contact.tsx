import { Container } from "@/components/Container";
import { profile } from "@/content/profile";
import { ContactForm } from "./ContactForm";
import { Highlight } from "./Highlight";

export function Contact() {
  return (
    <section id="contacto" className="py-20">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-[1.75rem] leading-[1.15] font-bold sm:text-h2">
            ¿Hablamos de <Highlight tone="primario">tu proyecto?</Highlight>
          </h2>
          <p className="mt-6 text-cuerpo">
            Contame si es una consulta general, una cotización o una asesoría técnica, y te respondo por email.
          </p>
        </div>
        <div className="marca bg-papel p-6 sm:p-8">
          <ContactForm />
        </div>
      </Container>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-tinta py-12 text-papel">
      <Container className="grid gap-8 sm:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="flex items-center gap-2 text-h3 font-bold">
            <span className="grid size-9 place-items-center rounded-full bg-papel text-pequeno text-tinta">
              {profile.firstName[0]}
            </span>
            {profile.knownAs}.dev
          </p>
          <p className="mt-3 max-w-sm text-pequeno">
            Desarrollo web fullstack desde {profile.city}, para equipos de cualquier lugar.
          </p>
        </div>
        <ul className="grid gap-2 text-pequeno">
          <li>
            <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="hover:underline">
              GitHub · @lautioliver
            </a>
          </li>
          <li>
            <a href={profile.xUrl} target="_blank" rel="noreferrer" className="hover:underline">
              X · @ltarooZ
            </a>
          </li>
        </ul>
      </Container>
      <Container>
        <p className="mt-10 border-t border-papel/20 pt-6 text-center text-xs">
          © 2026 {profile.name} · Hecho en {profile.city} · Versión de prueba
        </p>
      </Container>
    </footer>
  );
}
