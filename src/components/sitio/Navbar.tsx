"use client";

import { useEffect, useId, useState } from "react";
import { profile } from "@/content/profile";

const LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#sobre-mi", label: "Sobre mí" },
  { href: "#proyectos", label: "Proyectos" },
  { href: "#stack", label: "Stack" },
  { href: "#contacto", label: "Contacto" },
];

/** Barra flotante del manual: enlaces en PC; en celular, menú a pantalla completa (Escape lo cierra). */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-4 z-40 px-4">
      <nav
        aria-label="Principal"
        className="marca mx-auto flex max-w-3xl items-center justify-between gap-4 bg-papel py-2 pr-2 pl-3"
      >
        <a href="#inicio" className="flex items-center gap-2 font-bold" aria-label={`${profile.name}, inicio`}>
          <span className="grid size-9 place-items-center rounded-full bg-tinta text-pequeno text-papel">
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
      <div
        id={menuId}
        hidden={!open}
        className="fixed inset-x-0 top-24 bottom-0 z-30 bg-papel px-6 pt-8 lg:hidden"
      >
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
