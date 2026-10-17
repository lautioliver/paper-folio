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
from verificar import dependencias_viejas  # noqa: E402

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


class VerificarDePunta(unittest.TestCase):
    """verificar.py entero, en un repo temporal con un mapa de verificaciones de prueba."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="test-verificar-")
        self.addCleanup(shutil.rmtree, self.tmp)
        self.repo = os.path.join(self.tmp, "p")
        os.makedirs(os.path.join(self.repo, "docs"))
        shutil.copytree(AQUI, os.path.join(self.repo, "scripts", "agentes"),
                        ignore=shutil.ignore_patterns("__pycache__"))
        mapa = {"docs": [], "sensibles": [], "verificar": [
            {"nombre": "lint", "siempre": True, "correr": "echo CORRIO-LINT"},
        ]}
        escribir(os.path.join(self.repo, "docs", "mapa-agentes.json"), json.dumps(mapa))
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
        subprocess.run(["git", *args], cwd=cwd or self.repo, check=True, env={**os.environ, **GIT_ENV})

    def verificar(self, cwd=None, mapa=None):
        cwd = cwd or self.repo
        if mapa is not None:
            escribir(os.path.join(cwd, "docs", "mapa-agentes.json"), json.dumps(mapa))
        env = {**os.environ, **GIT_ENV, "BASE": "main"}
        return subprocess.run([sys.executable, os.path.join(cwd, "scripts", "agentes", "verificar.py")],
                              cwd=cwd, env=env, capture_output=True, text=True)

    def test_dependencias_viejas_avisa_antes_de_las_verificaciones_y_no_cambia_la_salida(self):
        escribir(os.path.join(self.repo, "node_modules", ".package-lock.json"), mtime=500_000)
        r = self.verificar()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn(COMANDO, r.stdout)
        self.assertIn("CORRIO-LINT", r.stdout)
        self.assertLess(r.stdout.index(COMANDO), r.stdout.index("CORRIO-LINT"))

    def test_con_una_verificacion_que_falla_sale_con_1_igual_que_sin_aviso(self):
        mapa = {"docs": [], "sensibles": [], "verificar": [
            {"nombre": "lint", "siempre": True, "correr": "exit 1"},
        ]}
        r = self.verificar(mapa=mapa)
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn(COMANDO, r.stdout)

    def test_al_dia_no_avisa(self):
        escribir(os.path.join(self.repo, "node_modules", ".package-lock.json"), mtime=2_000_000)
        r = self.verificar()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertNotIn(COMANDO, r.stdout)
        self.assertIn("CORRIO-LINT", r.stdout)

    def test_en_un_worktree_mira_las_dependencias_del_worktree(self):
        # El checkout principal está al día; el worktree no tiene node_modules.
        escribir(os.path.join(self.repo, "node_modules", ".package-lock.json"), mtime=2_000_000)
        wt = os.path.join(self.tmp, "wt")
        self.git("worktree", "add", "-q", "-b", "claude/2-otro", wt, "claude/1-algo")
        os.utime(os.path.join(wt, "package-lock.json"), (1_000_000, 1_000_000))
        r = self.verificar(cwd=wt)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn(COMANDO, r.stdout)
        # Y al revés: con el worktree al día, no lo confunde el checkout principal.
        escribir(os.path.join(wt, "node_modules", ".package-lock.json"), mtime=3_000_000)
        os.utime(os.path.join(self.repo, "node_modules", ".package-lock.json"), (1, 1))
        r = self.verificar(cwd=wt)
        self.assertNotIn(COMANDO, r.stdout)


if __name__ == "__main__":
    unittest.main()
