"use client";

import { useEffect, useId, useRef, useState } from "react";
import { profile } from "@/content/profile";

const LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#sobre-mi", label: "Sobre mí" },
  { href: "#proyectos", label: "Proyectos" },
  { href: "#stack", label: "Stack" },
  { href: "#contacto", label: "Contacto" },
];

// Mismo corte que lg de Tailwind: desde ahí la barra muestra los enlaces y el menú no existe.
const DESKTOP = "(min-width: 1024px)";

/**
 * Barra flotante del manual: enlaces en PC; en celular, menú a pantalla completa.
 * Con el menú abierto, el resto de la página queda inerte (el foco no sale del menú), Escape lo cierra
 * y el foco vuelve al botón. Al pasar a PC se cierra solo, para no dejar la página sin scroll.
 */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = document.querySelectorAll<HTMLElement>("main, footer");
    const desktop = window.matchMedia(DESKTOP);
    const close = (returnFocus: boolean) => {
      setOpen(false);
      if (returnFocus) toggleRef.current?.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const onResize = () => {
      if (desktop.matches) close(false);
    };
    outside.forEach((element) => (element.inert = true));
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    menuRef.current?.querySelector("a")?.focus();
    return () => {
      outside.forEach((element) => (element.inert = false));
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <header className="sticky top-4 z-40 px-4">
      <nav
        aria-label="Principal"
        className="marca relative z-10 mx-auto flex max-w-3xl items-center justify-between gap-4 bg-papel py-2 pr-2 pl-3"
      >
        <a href="#inicio" className="flex items-center gap-2 font-bold">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-tinta text-pequeno text-papel">
            {profile.firstName[0]}
          </span>
          <span>{profile.knownAs}.dev</span>
        </a>
        <ul className="hidden items-center gap-6 text-pequeno font-bold lg:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="hover:underline hover:underline-offset-4">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#contacto"
          className="hidden rounded-lg bg-tinta px-4 py-2 text-pequeno font-bold text-papel lg:inline-block"
        >
          Contactame
        </a>
        <button
          ref={toggleRef}
          type="button"
          className="grid size-11 place-items-center rounded-lg bg-tinta text-papel lg:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path
              d={open ? "M6 6 L18 18 M18 6 L6 18" : "M4 7 H20 M4 12 H20 M4 17 H20"}
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </nav>
      <div ref={menuRef} id={menuId} hidden={!open} className="fixed inset-0 bg-papel px-6 pt-28 lg:hidden">
        <ul className="flex flex-col gap-6">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-h2 font-bold" onClick={() => setOpen(false)}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
