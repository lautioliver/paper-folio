"""Tests del aviso de dependencias viejas en verificar.py (#11).

Decisión de @lautioliver en el issue: verificar.py solo avisa (con el comando para reinstalar)
antes de lint, typecheck y tests; no reinstala ni cambia el código de salida por eso.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from verificar import dependencias_viejas, usa_npm  # noqa: E402

COMANDO = "npm ci --ignore-scripts"
GIT_ENV = {
    "GIT_CONFIG_GLOBAL": os.devnull, "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_AUTHOR_NAME": "test", "GIT_AUTHOR_EMAIL": "t@t",
    "GIT_COMMITTER_NAME": "test", "GIT_COMMITTER_EMAIL": "t@t",
}


def escribir(ruta, texto="{}", mtime=None):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(texto)
    if mtime is not None:
        os.utime(ruta, (mtime, mtime))


class DependenciasViejas(unittest.TestCase):
    def setUp(self):
        self.raiz = tempfile.mkdtemp(prefix="test-verificar-")
        self.addCleanup(shutil.rmtree, self.raiz)
        self.lock = os.path.join(self.raiz, "package-lock.json")
        self.instalado = os.path.join(self.raiz, "node_modules", ".package-lock.json")

    def test_lock_mas_nuevo_que_lo_instalado_avisa_con_el_comando(self):
        escribir(self.instalado, mtime=1_000_000)
        escribir(self.lock, mtime=2_000_000)
        aviso = dependencias_viejas(self.raiz)
        self.assertIsNotNone(aviso)
        self.assertIn(COMANDO, aviso)

    def test_sin_node_modules_avisa_con_el_comando(self):
        escribir(self.lock)
        aviso = dependencias_viejas(self.raiz)
        self.assertIsNotNone(aviso)
        self.assertIn(COMANDO, aviso)

    def test_instalacion_a_medias_sin_package_lock_interno_avisa(self):
        escribir(self.lock)
        os.makedirs(os.path.join(self.raiz, "node_modules", "next"))
        self.assertIsNotNone(dependencias_viejas(self.raiz))

    def test_al_dia_no_avisa(self):
        escribir(self.lock, mtime=1_000_000)
        escribir(self.instalado, mtime=2_000_000)
        self.assertIsNone(dependencias_viejas(self.raiz))

    def test_mismo_mtime_no_avisa(self):
        escribir(self.lock, mtime=1_000_000)
        escribir(self.instalado, mtime=1_000_000)
        self.assertIsNone(dependencias_viejas(self.raiz))

    def test_sin_package_lock_no_avisa(self):
        self.assertIsNone(dependencias_viejas(self.raiz))
        escribir(self.instalado)
        self.assertIsNone(dependencias_viejas(self.raiz))


def entorno(**extra):
    """El entorno del proceso sin las variables de git que apuntarían al repo real (hooks, wrappers)."""
    env = {k: v for k, v in os.environ.items() if k not in ("GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE")}
    return {**env, **GIT_ENV, **extra}


def mapa(*reglas):
    return {"docs": [], "sensibles": [], "verificar": [
        {"nombre": nombre, "siempre": True, "correr": correr} for nombre, correr in reglas]}


class UsaNpm(unittest.TestCase):
    """Decide si el aviso importa: solo con verificaciones que corren npm o npx."""

    def test_reconoce_npm_y_npx(self):
        for cmd in ("npm run lint", "npx vitest related a.ts --run", "cd x && npm test"):
            with self.subTest(cmd=cmd):
                self.assertTrue(usa_npm(cmd))

    def test_ignora_otros_comandos_y_los_sin_configurar(self):
        for cmd in ("pnpm test", "npm-run-all", "TODO: npm run lint", "python3 scripts/agentes/check-docs.py"):
            with self.subTest(cmd=cmd):
                self.assertFalse(usa_npm(cmd))


class VerificarDePunta(unittest.TestCase):
    """verificar.py entero, en un repo temporal con un mapa de prueba y un npm falso en el PATH."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="test-verificar-")
        self.addCleanup(shutil.rmtree, self.tmp)
        self.repo = os.path.join(self.tmp, "p")
        os.makedirs(os.path.join(self.repo, "docs"))
        shutil.copytree(AQUI, os.path.join(self.repo, "scripts", "agentes"),
                        ignore=shutil.ignore_patterns("__pycache__"))
        # npm falso: imprime lo que le pidieron y falla con "npm run falla".
        self.bin = os.path.join(self.tmp, "bin")
        npm = os.path.join(self.bin, "npm")
        escribir(npm, '#!/bin/sh\necho "CORRIO-NPM $*"\n[ "$2" = falla ] && exit 1\nexit 0\n')
        os.chmod(npm, 0o755)
        escribir(os.path.join(self.repo, "docs", "mapa-agentes.json"), json.dumps(mapa(("lint", "npm run lint"))))
        escribir(os.path.join(self.repo, "package-lock.json"), mtime=1_000_000)
        escribir(os.path.join(self.repo, ".gitignore"), "node_modules/\n")
        self.git("init", "-q", "-b", "main")
        self.git("add", "-A")
        self.git("commit", "-qm", "base")
        self.git("switch", "-q", "-c", "claude/1-algo")
        escribir(os.path.join(self.repo, "nuevo.txt"), "x")
        self.git("add", "nuevo.txt")
        self.git("commit", "-qm", "x")

    def git(self, *args, cwd=None):
        subprocess.run(["git", *args], cwd=cwd or self.repo, check=True, env=entorno())

    def instalado(self, mtime, raiz=None):
        escribir(os.path.join(raiz or self.repo, "node_modules", ".package-lock.json"), mtime=mtime)

    def verificar(self, cwd=None, reglas=None):
        cwd = cwd or self.repo
        if reglas is not None:
            escribir(os.path.join(cwd, "docs", "mapa-agentes.json"), json.dumps(mapa(*reglas)))
        env = entorno(BASE="main", PATH=self.bin + os.pathsep + os.environ.get("PATH", ""))
        return subprocess.run([sys.executable, os.path.join(cwd, "scripts", "agentes", "verificar.py")],
                              cwd=cwd, env=env, capture_output=True, text=True)

    def assertCorrio(self, r, codigo=0):
        self.assertEqual(r.returncode, codigo, r.stdout + r.stderr)
        self.assertIn("CORRIO-NPM", r.stdout)

    def test_dependencias_viejas_avisa_antes_de_las_verificaciones_y_no_cambia_la_salida(self):
        self.instalado(500_000)
        r = self.verificar()
        self.assertCorrio(r)
        self.assertIn(COMANDO, r.stdout)
        self.assertLess(r.stdout.index(COMANDO), r.stdout.index("CORRIO-NPM"))

    def test_con_una_verificacion_de_npm_que_falla_sale_con_1_y_lo_recuerda_al_final(self):
        r = self.verificar(reglas=[("lint", "npm run falla")])
        self.assertCorrio(r, codigo=1)
        resultado = r.stdout[r.stdout.index("Resultado:"):]
        self.assertIn(COMANDO, resultado)

    def test_si_falla_una_verificacion_sin_npm_no_culpa_a_las_dependencias(self):
        r = self.verificar(reglas=[("lint", "npm run lint"), ("docs", "exit 1")])
        self.assertCorrio(r, codigo=1)
        resultado = r.stdout[r.stdout.index("Resultado:"):]
        self.assertNotIn(COMANDO, resultado)

    def test_sin_verificaciones_de_npm_que_corran_no_avisa(self):
        r = self.verificar(reglas=[("docs", "echo DOCS"), ("lint", "TODO: npm run lint")])
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertNotIn(COMANDO, r.stdout)

    def test_al_dia_no_avisa(self):
        self.instalado(2_000_000)
        r = self.verificar()
        self.assertCorrio(r)
        self.assertNotIn(COMANDO, r.stdout)

    def test_en_un_worktree_mira_las_dependencias_del_worktree(self):
        # El checkout principal está al día; el worktree no tiene node_modules.
        self.instalado(2_000_000)
        wt = os.path.join(self.tmp, "wt")
        self.git("worktree", "add", "-q", "-b", "claude/2-otro", wt, "claude/1-algo")
        os.utime(os.path.join(wt, "package-lock.json"), (1_000_000, 1_000_000))
        r = self.verificar(cwd=wt)
        self.assertCorrio(r)
        self.assertIn(COMANDO, r.stdout)
        # Y al revés: con el worktree al día, no lo confunde el checkout principal.
        self.instalado(3_000_000, raiz=wt)
        self.instalado(1, raiz=self.repo)
        r = self.verificar(cwd=wt)
        self.assertCorrio(r)
        self.assertNotIn(COMANDO, r.stdout)


if __name__ == "__main__":
    unittest.main()
