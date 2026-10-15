import type { Tone } from "@/components/sitio/tones";

// Datos del PoC (#18): perfil, README y repos PÚBLICOS de github.com/lautioliver (2026-10-15).
// Los repos privados no se muestran. Se reemplaza por contenido administrable con el CRUD del hito 5.

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

export type Service = {
  title: string;
  description: string;
  icon: "frontend" | "backend" | "database" | "integrations" | "deploy";
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
    caso: { problema: "", solucion: "", funcionalidades: [], stack: [] },
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
    caso: { problema: "", solucion: "", funcionalidades: [], stack: [] },
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
    caso: { problema: "", solucion: "", funcionalidades: [], stack: [] },
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
    caso: { problema: "", solucion: "", funcionalidades: [], stack: [] },
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
