"use client";

import { useCallback, useState } from "react";
import { mensajeDeValidez } from "@/lib/validacion-campo";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type Errores = Record<string, string | undefined>;

function esControl(destino: EventTarget | null): destino is Control {
  if (!(
    destino instanceof HTMLInputElement ||
    destino instanceof HTMLSelectElement ||
    destino instanceof HTMLTextAreaElement
  )) {
    return false;
  }
  return destino.name !== "" && destino.type !== "file" && destino.type !== "hidden";
}

function mensajeDe(control: Control): string | undefined {
  const lleva = control instanceof HTMLSelectElement ? undefined : control;
  if (control.validity.valid) return undefined;
  // Si es un estado que no conocemos (rango, paso…), el mensaje del navegador antes que nada.
  return (
    mensajeDeValidez(control.validity, {
      tipo: lleva?.type,
      maxLength: lleva && lleva.maxLength >= 0 ? lleva.maxLength : undefined,
      minLength: lleva && lleva.minLength >= 0 ? lleva.minLength : undefined,
    }) ??
    (control.validationMessage || "Revisá este campo.")
  );
}

/**
 * Validación en vivo de los formularios del panel, con las reglas nativas de cada campo (`required`,
 * `maxLength`, `type`, `pattern`): avisa al salir del campo y, si ya tenía un error, mientras se escribe. El
 * error del servidor (`servidor`) se muestra hasta que se toca ese campo. Es solo ayuda: la validación que
 * vale es la del servidor. Devuelve los errores a mostrar, el largo de cada texto (para el contador) y las
 * props del contenedor (`display: contents`) que escucha los eventos de todos los campos.
 */
export function useValidacionEnVivo(servidor: Errores = {}) {
  const [locales, setLocales] = useState<Errores>({});
  const [largos, setLargos] = useState<Record<string, number>>({});

  const errores: Errores = { ...servidor, ...locales };

  // Al intentar enviar con algo inválido, el navegador dispara `invalid` en cada campo: se reemplaza su
  // globo por el mensaje del campo y el foco va al primero.
  const contenedor = useCallback((nodo: HTMLDivElement | null) => {
    if (!nodo) return;
    let primero = true;
    const alInvalidar = (evento: Event) => {
      if (!esControl(evento.target)) return;
      evento.preventDefault();
      const control = evento.target;
      setLocales((previos) => ({
        ...previos,
        [control.name]: mensajeDe(control),
      }));
      if (primero) {
        primero = false;
        control.focus();
        setTimeout(() => {
          primero = true;
        });
      }
    };
    nodo.addEventListener("invalid", alInvalidar, true);
    return () => nodo.removeEventListener("invalid", alInvalidar, true);
  }, []);

  function alSalir(evento: React.FocusEvent<HTMLElement>) {
    const control = evento.target;
    if (!esControl(control)) return;
    const mensaje = mensajeDe(control);
    if (mensaje) setLocales((previos) => ({ ...previos, [control.name]: mensaje }));
    else if (control.name in locales) setLocales((previos) => ({ ...previos, [control.name]: undefined }));
  }

  function alEscribir(evento: React.FormEvent<HTMLElement>) {
    const control = evento.target;
    if (!esControl(control)) return;
    if (control instanceof HTMLTextAreaElement || (control instanceof HTMLInputElement && control.type === "text")) {
      setLargos((previos) => ({
        ...previos,
        [control.name]: control.value.length,
      }));
    }
    if (errores[control.name])
      setLocales((previos) => ({
        ...previos,
        [control.name]: mensajeDe(control),
      }));
  }

  return {
    errores,
    largos,
    contenedor: {
      ref: contenedor,
      className: "contents",
      onBlur: alSalir,
      onInput: alEscribir,
    },
  };
}

/** Contador de caracteres de un texto largo: `largo` es lo escrito (o el largo inicial, si todavía no se tocó). */
export function Contador({ largo, max }: { largo: number; max: number }) {
  return (
    <span className="text-pequeno font-normal">
      {largo} / {max} caracteres
    </span>
  );
}

/** Marca de campo obligatorio: el asterisco es visual, `required` ya lo anuncia al lector de pantalla. */
export function Obligatorio() {
  return (
    <span aria-hidden="true" className="ml-1">
      *
    </span>
  );
}

export function NotaObligatorios() {
  return <p className="text-pequeno">Los campos con * son obligatorios.</p>;
}
