"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { profile } from "@/content/profile";
import { alAbrirOtroMenu, avisarMenuAbierto } from "@/lib/menus";
import { seccionActiva } from "@/lib/seccion-activa";

const LINKS = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/#sobre-mi", label: "Sobre mí" },
  { href: "/#proyectos", label: "Proyectos" },
  { href: "/#stack", label: "Stack" },
  { href: "/#contacto", label: "Contacto" },
];

// Mismo corte que lg de Tailwind: desde ahí la barra muestra los enlaces y el menú no existe.
const DESKTOP = "(min-width: 1024px)";

// Scroll desde el que la barra se compacta, y línea (fracción del alto de la pantalla) que define la sección activa.
const SCROLL_COMPACTA = 24;
const LINEA_ACTIVA = 0.4;
const IDS = LINKS.map((link) => link.href.split("#")[1] ?? "");

/**
 * Barra flotante del manual: enlaces en PC; en celular, menú a pantalla completa.
 * Con el menú abierto, el resto de la página queda inerte (el foco no sale del menú), Escape lo cierra
 * y el foco vuelve al botón. Al pasar a PC se cierra solo, para no dejar la página sin scroll.
 * `cuenta` es la sesión (Ingresar o el menú del avatar): llega de afuera para que la lectura de la sesión
 * quede en el servidor, en un Suspense, y no vuelva dinámica toda la página.
 * Los enlaces llevan "/#…" para que sirvan también desde otras páginas (como /cuenta).
 * Al scrollear se compacta y gana sombra (data-compacta), y un indicador se desliza al enlace de la sección activa
 * (aria-current). Ambos siguen el scroll con un listener pasivo que solo cambia estado cuando el valor cambia.
 */
export function Navbar({ cuenta }: { cuenta?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const [compacta, setCompacta] = useState(false);
  const [activa, setActiva] = useState<string | null>(null);
  const [indicador, setIndicador] = useState<{ x: number; ancho: number } | null>(null);

  useEffect(() => {
    let pendiente = false;
    let frame = 0;
    const medir = () => {
      pendiente = false;
      setCompacta(window.scrollY > SCROLL_COMPACTA);
      setActiva(
        seccionActiva(
          IDS.map((id) => ({ id, top: document.getElementById(id)?.getBoundingClientRect().top ?? null })),
          window.innerHeight * LINEA_ACTIVA,
        ),
      );
    };
    const onScroll = () => {
      if (pendiente) return;
      pendiente = true;
      frame = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // El indicador se posiciona con la medida del enlace activo; se recalcula si cambia el ancho de la lista.
  useEffect(() => {
    const lista = listaRef.current;
    if (!lista) return;
    const posicionar = () => {
      const enlace = activa ? lista.querySelector<HTMLElement>(`[data-seccion="${activa}"]`) : null;
      setIndicador(enlace ? { x: enlace.offsetLeft, ancho: enlace.offsetWidth } : null);
    };
    posicionar();
    const observer = new ResizeObserver(posicionar);
    observer.observe(lista);
    return () => observer.disconnect();
  }, [activa]);

  // Si se abre el menú de la cuenta, este se cierra (sin mover el foco: ya está en el otro menú).
  useEffect(() => alAbrirOtroMenu(menuId, () => setOpen(false)), [menuId]);

  useEffect(() => {
    if (!open) return;
    avisarMenuAbierto(menuId);
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
  }, [open, menuId]);

  return (
    <header className="sticky top-4 z-40 px-4">
      <nav
        aria-label="Principal"
        data-compacta={compacta}
        className="navbar-barra marca relative z-10 mx-auto flex max-w-3xl items-center justify-between gap-4 bg-papel py-2 pr-2 pl-3"
      >
        <Link href="/#inicio" className="flex items-center gap-2 font-bold">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-tinta text-pequeno text-papel">
            {profile.firstName[0]}
          </span>
          <span>{profile.knownAs}.dev</span>
        </Link>
        <ul ref={listaRef} className="relative hidden items-center gap-6 text-pequeno font-bold lg:flex">
          {LINKS.map((link, i) => (
            <li key={link.href} data-seccion={IDS[i]}>
              <a
                href={link.href}
                aria-current={activa === IDS[i] ? "location" : undefined}
                className="hover:underline hover:underline-offset-4"
              >
                {link.label}
              </a>
            </li>
          ))}
          {indicador && (
            <li
              aria-hidden="true"
              className="navbar-indicador pointer-events-none absolute -bottom-1 left-0 h-[3px] w-px origin-left bg-tinta"
              style={{ transform: `translateX(${indicador.x}px) scaleX(${indicador.ancho})` }}
            />
          )}
        </ul>
        <div className="flex items-center gap-2">
          <Link
            href="/#contacto"
            className="hidden rounded-lg bg-tinta px-4 py-2 text-pequeno font-bold text-papel lg:inline-block"
          >
            Contactame
          </Link>
          {cuenta}
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
        </div>
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
