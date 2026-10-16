import type { Tone } from "@/components/sitio/tones";

// Datos del PoC (#18): perfil, README y repos PÚBLICOS de github.com/lautioliver (2026-10-15).
// Los repos privados no se muestran. Los proyectos y servicios viven en la base (#48, ADR-003): esto es
// el contenido inicial que carga `npm run seed:contenido` y el respaldo si la base no responde.

export const profile = {
  name: "Lautaro Zahir Oliver",
  firstName: "Lautaro",
  knownAs: "Lauti",
  city: "Salta",
  role: "Estudiante de Ingeniería en Computación en la UCASAL",
  intro:
    "Construyo aplicaciones web de punta a punta: interfaces en Next.js y React, APIs en TypeScript y bases de datos en PostgreSQL. Muchas nacen de un problema real de la facu.",
  about:
    "Empecé armando scripts para automatizar mi cursada en la UCASAL y terminé construyendo plataformas que usan otros estudiantes. Me gusta entender el problema completo, del botón a la base de datos. Fuera del código: ajedrez y Fórmula 1.",
  githubHandle: "lautioliver",
  githubUrl: "https://github.com/lautioliver",
  xHandle: "ltarooZ",
  xUrl: "https://x.com/ltarooZ",
  githubSince: 2024,
  // Fecha de los datos: de acá sale el año del pie (new Date() no se puede prerenderizar).
  asOf: "2026-10-15",
} as const;

export const stack = [
  "TypeScript",
  "Next.js",
  "React",
  "Tailwind CSS",
  "PostgreSQL",
  "Prisma",
  "Python",
  "Vitest",
] as const;

// Íconos SVG de los servicios (`ServiceIcon`): el modelo `Servicio` solo acepta estos.
export const SERVICE_ICONS = ["frontend", "backend", "database", "integrations", "deploy"] as const;
export type ServiceIcon = (typeof SERVICE_ICONS)[number];

export type Service = {
  title: string;
  description: string;
  icon: ServiceIcon;
};

export const services: Service[] = [
  {
    title: "Frontend",
    description: "Interfaces en Next.js, React y Tailwind, responsive y con modo claro y oscuro.",
    icon: "frontend",
  },
  {
    title: "Backend",
    description: "APIs en TypeScript con validación en Zod y lógica en servicios, no en las rutas.",
    icon: "backend",
  },
  {
    title: "Bases de datos",
    description: "Modelado en PostgreSQL con Prisma y migraciones versionadas; Neon en producción.",
    icon: "database",
  },
  {
    title: "Integraciones",
    description: "Emails transaccionales con Resend, verificación de cuentas y asistentes con IA.",
    icon: "integrations",
  },
  {
    title: "Deploy",
    description: "Proyectos publicados en Vercel, con tests en Vitest y CI en GitHub Actions.",
    icon: "deploy",
  },
];

export type CasoDeEstudio = {
  problema: string;
  solucion: string;
  funcionalidades: string[];
  stack: string[];
};

export type Project = {
  slug: string;
  initial: string;
  name: string;
  category: string;
  description: string;
  stack: string[];
  demoUrl: string;
  repoUrl: string;
  accent: Tone;
  caso: CasoDeEstudio;
};

export const projects: Project[] = [
  {
    slug: "ucanode",
    initial: "U",
    name: "UcaNode",
    category: "Fullstack",
    description:
      "Autogestión para estudiantes de la UCASAL: materias, entregas con apuntes y exportación a PDF, horarios y una comunidad con votos y comentarios.",
    stack: ["Next.js 16", "Prisma", "PostgreSQL", "Resend"],
    demoUrl: "https://ucanode.app",
    repoUrl: "https://github.com/lautioliver/UcaNode",
    accent: "terciario",
    caso: {
      problema:
        "Organizar en un solo lugar las materias, entregas, horarios y links útiles de la cursada en la UCASAL. La referencia era un dashboard personal de Notion.",
      solucion:
        "Una aplicación web independiente, con PostgreSQL, que junta todo eso y suma una comunidad estudiantil.",
      funcionalidades: [
        "Registro y login con verificación de email (Resend) y onboarding con selección de carrera y plan de estudios.",
        "Dashboard con próximas entregas, clases del día, materias en curso y links favoritos.",
        "Materias con año, semestre, estados y correlatividades; entregas por materia, tipo, fecha, prioridad y estado.",
        "Apuntes enriquecidos con autosave y exportación a PDF (beta), y grilla semanal de horarios.",
        "Comunidad con publicaciones, votos y comentarios anidados, y hubs públicos por universidad.",
        "Tema claro y oscuro, búsqueda global (Ctrl+K) y concurrencia del campus vía CampuStatus.",
      ],
      stack: ["Next.js 16 (App Router)", "React 19", "Tailwind CSS 4 y shadcn/ui", "Prisma 7", "PostgreSQL (Neon)", "Zod", "Resend", "Vitest", "Vercel"],
    },
  },
  {
    slug: "numerika-ai",
    initial: "N",
    name: "NumérikaAI",
    category: "Educación",
    description:
      "Métodos numéricos que se entienden: solver paso a paso de cinco métodos, gráfico con zoom, comparador y explicaciones con IA.",
    stack: ["JavaScript", "Recharts", "Python"],
    demoUrl: "https://numerika-ai.vercel.app",
    repoUrl: "https://github.com/lautioliver/numerika-ai",
    accent: "secundario",
    caso: {
      problema:
        "A los estudiantes de ingeniería les cuesta comprender los métodos numéricos, no solo calcularlos: saber por qué un método converge, diverge o falla.",
      solucion:
        "Una plataforma educativa en español que resuelve paso a paso, muestra el resultado en un gráfico y explica cada caso, con apoyo de inteligencia artificial.",
      funcionalidades: [
        "Solver interactivo con cinco métodos: bisección, regla falsa, Newton-Raphson, secante y punto fijo.",
        "Tabla de iteraciones paso a paso y gráfico de f(x) con zoom y la raíz marcada.",
        "Análisis de convergencia que explica por qué el método convergió o no, con mensajes de error claros.",
        "Comparador que corre los métodos sobre la misma función y compara iteraciones, error y tiempo.",
        "Explicaciones con IA y un asistente contextual (en desarrollo).",
      ],
      stack: ["React 19", "Vite 7", "Recharts", "Node.js y Express 5", "PostgreSQL 15", "OpenAI API", "math.js", "JWT y bcrypt", "Vercel"],
    },
  },
  {
    slug: "campustatus",
    initial: "C",
    name: "CampuStatus",
    category: "Web App",
    description:
      "Concurrencia colaborativa del campus: ocupación de bibliotecas y comedores con reportes anónimos y cooldown por zona.",
    stack: ["Next.js 15", "Prisma", "PostgreSQL"],
    demoUrl: "https://campu-status.vercel.app",
    repoUrl: "https://github.com/lautioliver/CampuStatus",
    accent: "acento",
    caso: {
      problema:
        "Saber cuánta gente hay en la biblioteca, el comedor y otros espacios del campus antes de ir.",
      solucion:
        "Un sistema colaborativo de concurrencia: se consulta la ocupación de cada espacio y se envían reportes anónimos, con un cooldown por zona para evitar abusos.",
      funcionalidades: [
        "Consulta de la ocupación de bibliotecas, comedores y otros espacios, por zona.",
        "Reportes anónimos con cooldown por zona.",
        "Los reportes solo se aceptan desde IPs del campus.",
        "API REST con health check, listado y detalle de zonas, y registro de reportes.",
      ],
      stack: ["Next.js 15", "React 19", "Prisma", "PostgreSQL (Neon)", "Tailwind CSS", "Vercel"],
    },
  },
  {
    slug: "barrilete-kit",
    initial: "B",
    name: "barrilete-kit",
    category: "Open source",
    description:
      "Plantilla para trabajar con agentes de código sin perder el control: reglas, skills y docs que se testean, del plan al PR.",
    stack: ["Bash", "Python", "GitHub Actions"],
    demoUrl: "https://barrilete-kit-lp-5n68.vercel.app",
    repoUrl: "https://github.com/lautioliver/barrilete-kit",
    accent: "primario",
    caso: {
      problema:
        "Trabajar con agentes de código sin perder el control de lo que cambian.",
      solucion:
        "Una plantilla de repo con reglas, skills y documentación que se testea, con un flujo de issue a PR donde las personas aprueban el plan y mergean.",
      funcionalidades: [
        "AGENTS.md define qué puede hacer un agente solo, qué tiene que consultar y qué nunca.",
        "Skills para el ciclo completo: planificar, abrir issues, implementar con TDD, revisar PRs, debuggear y migrar la base.",
        "CI que valida links, rutas y ADRs, y avisa qué docs revisar según lo que cambió.",
        "Cada corrida deja una retro, y los ajustes a las skills llegan siempre en un PR.",
      ],
      stack: ["Bash", "Python 3", "GitHub Actions", "GitHub CLI", "Claude Code y Cursor"],
    },
  },
];

export type Milestone = { date: string; title: string; description: string };

// Fechas de creación de cada repo público (más nuevo primero).
export const milestones: Milestone[] = [
  {
    date: "Oct 2026",
    title: "barrilete-kit",
    description: "Plantilla open source para trabajar con agentes de código.",
  },
  {
    date: "Sep 2026",
    title: "SaltaSpots",
    description: "Prueba de concepto para encontrar dónde trabajar en Salta.",
  },
  {
    date: "Jul 2026",
    title: "UcaNode y CampuStatus",
    description: "Dos plataformas para estudiantes de la UCASAL, en producción.",
  },
  {
    date: "Mar 2026",
    title: "NumérikaAI",
    description: "Plataforma para aprender métodos numéricos en español.",
  },
  {
    date: "2024",
    title: "Primeros pasos en GitHub",
    description: "Ingeniería en Computación en la UCASAL.",
  },
];
