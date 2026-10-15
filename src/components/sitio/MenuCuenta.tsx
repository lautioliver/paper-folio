"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { puedeVerPanel } from "@/lib/ingreso";
import { salir } from "@/lib/sesion-acciones";
import type { Rol } from "@/models/Usuario";

const ITEM = "block w-full rounded-lg px-3 py-2 text-left text-pequeno font-bold hover:bg-superficie";

export function EnlaceIngresar() {
  return (
    <Link
      href="/ingresar"
      className="marca apretable inline-flex min-h-11 items-center bg-papel px-4 text-pequeno font-bold"
    >
      Ingresar
    </Link>
  );
}

/**
 * Avatar de Google con el menú de la cuenta: "Mi cuenta", "Panel" (solo operador y admin; es solo UI,
 * la página se protege en el servidor) y "Salir". Teclado: Escape cierra y devuelve el foco al botón, y
 * el foco que sale del menú lo cierra.
 */
export function MenuCuenta({ nombre, imagen, rol }: { nombre: string; imagen: string | null; rol: Rol | undefined }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const raizRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!raizRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div
      ref={raizRef}
      className="relative"
      onBlur={(event) => {
        // El foco salió del avatar y del menú (Tab): se cierra, sin robar el foco a donde fue.
        if (open && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        className="grid size-11 place-items-center overflow-hidden rounded-full border-2 border-tinta bg-tinta text-papel"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Menú de la cuenta de ${nombre}`}
        onClick={() => setOpen((value) => !value)}
      >
        {imagen ? (
          // Foto de Google: next/image pediría configurar dominios remotos; acá no hace falta optimizarla.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagen} alt="" width={44} height={44} referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true" className="text-pequeno font-bold">
            {nombre[0]?.toUpperCase()}
          </span>
        )}
      </button>
      <div
        ref={menuRef}
        id={menuId}
        hidden={!open}
        className="marca absolute top-full right-0 z-20 mt-2 w-48 bg-papel p-2"
      >
        <p className="truncate px-3 py-1 text-pequeno text-tinta/70">{nombre}</p>
        <Link href="/cuenta" className={ITEM} onClick={() => setOpen(false)}>
          Mi cuenta
        </Link>
        {puedeVerPanel(rol) && (
          <Link href="/panel" className={ITEM} onClick={() => setOpen(false)}>
            Panel
          </Link>
        )}
        <form action={salir}>
          <button type="submit" className={ITEM}>
            Salir
          </button>
        </form>
      </div>
    </div>
  );
}
