#!/usr/bin/env python3
"""Última guardia antes del PR: según lo que cambió, decide qué verificar y lo corre.

Las verificaciones se configuran en la sección "verificar" de docs/mapa-agentes.json:
  {"nombre": "tests", "siempre": true, "correr": "npm test"}
  {"nombre": "migraciones", "cuando": ["db/schema/**"], "correr": "…"}
Una verificación corre si es "siempre" o si algún archivo cambiado coincide con "cuando".
En "correr" se pueden usar {base} (la referencia de la rama base, p. ej. origin/main)
y {archivos} (los archivos cambiados que coinciden, entre comillas).
Un "correr" que empieza con "TODO" se informa como sin configurar y no se ejecuta.

Uso:
  verificar.py                 # contra la rama base (BASE, main o la del remoto)
  verificar.py --base develop
  verificar.py --listar        # muestra qué correría, sin correr nada
Sale con 1 si alguna verificación falla.
Antes de correr, si alguna verificación usa npm o npx, avisa (sin reinstalar ni cambiar el código
de salida) si package-lock.json es más nuevo que node_modules/.package-lock.json o no hay nada
instalado, con el comando para reinstalar. Mira el repo o worktree donde corre.
"""
import json
import os
import re
import shlex
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mapa import RAIZ, archivos_cambiados, coincide, existe, rama_base  # noqa: E402


REINSTALAR = "npm ci --ignore-scripts"


def dependencias_viejas(raiz):
    """Devuelve un aviso si las dependencias de npm de `raiz` no corresponden a package-lock.json.

    npm escribe node_modules/.package-lock.json recién al terminar de instalar bien: si falta
    (sin instalar o a medias) o es más viejo que package-lock.json (un rebase o un merge trajo
    otro lock), lint, typecheck y tests correrían contra otras dependencias. Sin package-lock.json
    no hay nada que comparar. Solo avisa: no reinstala (#11).
    """
    lock = os.path.join(raiz, "package-lock.json")
    instalado = os.path.join(raiz, "node_modules", ".package-lock.json")
    if not os.path.isfile(lock):
        return None
    if not os.path.isfile(instalado):
        problema = "no hay dependencias instaladas (falta node_modules/.package-lock.json)"
    elif os.path.getmtime(lock) > os.path.getmtime(instalado):
        problema = "package-lock.json es más nuevo que lo instalado en node_modules"
    else:
        return None
    return (f"⚠ Dependencias viejas: {problema}. Las verificaciones de npm pueden fallar con errores "
            f"confusos (módulos que no se encuentran) o dar resultados engañosos.\n"
            f"  Reinstalá antes de seguir: {REINSTALAR}")


def usa_npm(cmd):
    """Si la verificación corre algo de npm (npm, npx) y no está sin configurar (TODO)."""
    return not cmd.startswith("TODO") and re.search(r"(^|[\s;&|(])np[mx](\s|$)", cmd) is not None


def referencia_base(args, base):
    return f"origin/{base}" if existe(f"origin/{base}") else base


def main():
    args = sys.argv[1:]
    os.chdir(RAIZ)
    ruta_mapa = os.path.join(RAIZ, "docs", "mapa-agentes.json")
    if not os.path.exists(ruta_mapa):
        print("verificar.py: no hay docs/mapa-agentes.json.", file=sys.stderr)
        sys.exit(2)
    reglas = json.load(open(ruta_mapa, encoding="utf-8")).get("verificar", [])
    if not reglas:
        print("verificar.py: el mapa no tiene sección 'verificar'.", file=sys.stderr)
        sys.exit(2)

    rama = rama_base(args)
    if "--base" in args:  # se reemplaza por la resuelta, para no avisar dos veces
        i = args.index("--base")
        args = args[:i] + args[i + 2:]
    args += ["--base", rama]
    cambiados = archivos_cambiados(args)  # sale con un mensaje claro si la base no existe
    base = referencia_base(args, rama)

    plan = []
    for r in reglas:
        # En las que corren siempre (sin "cuando"), {archivos} son todos los cambiados.
        tocados = [a for a in cambiados if coincide(a, r["cuando"])] if r.get("cuando") else list(cambiados)
        if r.get("siempre") or tocados:
            motivo = "siempre" if r.get("siempre") and not r.get("cuando") else f"{len(tocados)} archivo(s): {', '.join(tocados[:3])}"
            cmd = r["correr"].replace("{base}", base).replace("{archivos}", " ".join(shlex.quote(a) for a in tocados))
            plan.append((r["nombre"], motivo, cmd))

    print(f"Cambios contra {base}: {len(cambiados)} archivo(s). Verificaciones: {len(plan)}.\n")
    # Solo importa si alguna verificación que va a correr usa npm.
    aviso = dependencias_viejas(RAIZ) if any(usa_npm(cmd) for _, _, cmd in plan) else None
    if aviso:
        print(aviso + "\n", flush=True)
    if "--listar" in args:
        for nombre, motivo, cmd in plan:
            print(f"- {nombre} ({motivo})\n    {cmd}")
        return

    resultados = []
    for nombre, motivo, cmd in plan:
        if cmd.startswith("TODO"):
            resultados.append((nombre, "sin configurar", 0, cmd))
            continue
        print(f"▶ {nombre} ({motivo})\n  $ {cmd}", flush=True)
        t0 = time.time()
        ok = subprocess.run(cmd, shell=True).returncode == 0
        resultados.append((nombre, "ok" if ok else "FALLÓ", time.time() - t0, cmd))
        print(flush=True)

    print("Resultado:")
    for nombre, estado, seg, _ in resultados:
        print(f"  {estado:15} {nombre}" + (f" ({seg:.0f}s)" if seg else ""))
    sin_config = [n for n, e, _, _ in resultados if e == "sin configurar"]
    fallaron = [cmd for _, e, _, cmd in resultados if e == "FALLÓ"]
    if fallaron:
        print("\nHay verificaciones que fallan: corregilas antes de abrir el PR. No las desactives.")
        if aviso and any(usa_npm(cmd) for cmd in fallaron):
            print(f"Las dependencias estaban viejas: corré {REINSTALAR} y volvé a verificar antes de buscar la causa.")
        sys.exit(1)
    if sin_config:
        print(f"\nPasó lo configurado, pero {', '.join(sin_config)} no se verificó: falta el comando en "
              "docs/mapa-agentes.json. No digas que el cambio está verificado.")
        return
    print("\nTodo verificado.")


if __name__ == "__main__":
    main()
