// Ilustraciones de línea simple del manual: contorno de 2 px en tinta y rellenos planos de la paleta.
// Colores solo por token (var(--color-…)); nada de HEX.

const INK = "var(--color-tinta)";

/** Personaje con anteojos y una etiqueta de código, sobre la tarjeta amarilla del hero. */
export function HeroCharacter() {
  return (
    <svg viewBox="0 0 360 360" className="h-full w-full" aria-hidden="true">
      <circle cx="70" cy="90" r="20" fill="var(--color-acento)" stroke={INK} strokeWidth="4" />
      <circle cx="300" cy="70" r="28" fill="var(--color-papel)" stroke={INK} strokeWidth="4" />
      <path d="M60 360 C60 270 120 240 180 240 C240 240 300 270 300 360 Z" fill={INK} />
      <path d="M150 242 L180 290 L210 242 Z" fill="var(--color-papel)" stroke={INK} strokeWidth="4" />
      <rect x="160" y="200" width="40" height="46" rx="10" fill="var(--color-papel)" stroke={INK} strokeWidth="4" />
      <circle cx="180" cy="150" r="66" fill="var(--color-papel)" stroke={INK} strokeWidth="4" />
      <path d="M114 150 C110 96 150 80 180 80 C214 80 252 98 246 150 C234 120 140 116 114 150 Z" fill={INK} />
      <circle cx="158" cy="160" r="16" fill="none" stroke={INK} strokeWidth="4" />
      <circle cx="204" cy="160" r="16" fill="none" stroke={INK} strokeWidth="4" />
      <path d="M174 160 H188" stroke={INK} strokeWidth="4" />
      <path d="M166 190 Q181 202 196 190" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <rect x="236" y="270" width="72" height="50" rx="10" fill="var(--color-acento)" stroke={INK} strokeWidth="4" />
      <path d="M262 284 L252 295 L262 306 M282 284 L292 295 L282 306" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Retrato redondo de la sección "Sobre mí". */
export function Portrait() {
  return (
    <svg viewBox="0 0 320 320" className="h-full w-full" aria-hidden="true">
      <circle cx="160" cy="160" r="150" fill="var(--color-acento)" stroke={INK} strokeWidth="4" />
      <path d="M62 272 C80 210 120 196 160 196 C200 196 240 210 258 272 A150 150 0 0 1 62 272 Z" fill="var(--color-papel)" stroke={INK} strokeWidth="4" />
      <circle cx="160" cy="130" r="54" fill="var(--color-papel)" stroke={INK} strokeWidth="4" />
      <path d="M106 128 C104 82 136 70 160 70 C190 70 218 84 214 128 C200 102 124 100 106 128 Z" fill={INK} />
      <circle cx="142" cy="136" r="5" fill={INK} />
      <circle cx="178" cy="136" r="5" fill={INK} />
      <path d="M146 158 Q160 168 174 158" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Ventana de navegador de las tarjetas de proyecto; el cuadro grande toma el color del proyecto. */
export function BrowserMock({ tone }: { tone: "primario" | "acento" | "secundario" | "terciario" }) {
  const block = tone === "primario" ? "var(--color-acento)" : "var(--color-primario)";
  return (
    <svg viewBox="0 0 280 180" className="h-auto w-full max-w-72" aria-hidden="true">
      <rect x="2" y="2" width="276" height="176" rx="16" fill="var(--color-papel)" stroke={INK} strokeWidth="4" />
      <path d="M2 34 H278" stroke={INK} strokeWidth="4" />
      <circle cx="22" cy="18" r="5" fill={INK} />
      <circle cx="38" cy="18" r="5" fill={INK} />
      <rect x="22" y="52" width="110" height="106" rx="10" fill={block} stroke={INK} strokeWidth="4" />
      <circle cx="77" cy="105" r="22" fill="var(--color-papel)" stroke={INK} strokeWidth="4" />
      <rect x="150" y="56" width="108" height="10" rx="5" fill={INK} />
      <rect x="150" y="80" width="108" height="30" rx="8" fill="var(--color-superficie)" stroke={INK} strokeWidth="4" />
      <rect x="150" y="122" width="108" height="30" rx="8" fill="var(--color-superficie)" stroke={INK} strokeWidth="4" />
    </svg>
  );
}

type ServiceIconProps = { icon: "frontend" | "backend" | "database" | "integrations" | "deploy" };

/** Ilustración chica de cada servicio, sobre el fondo superficie de la tarjeta. */
export function ServiceIcon({ icon }: ServiceIconProps) {
  const common = { fill: "none", stroke: INK, strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 160 100" className="h-24 w-auto" aria-hidden="true">
      {icon === "frontend" && (
        <>
          <rect x="20" y="10" width="120" height="80" rx="10" fill="var(--color-papel)" stroke={INK} strokeWidth="4" />
          <path d="M20 28 H140" {...common} />
          <circle cx="32" cy="19" r="3" fill="var(--color-acento)" />
          <circle cx="42" cy="19" r="3" fill="var(--color-primario)" />
          <circle cx="52" cy="19" r="3" fill="var(--color-secundario)" />
          <rect x="32" y="40" width="40" height="38" rx="6" fill="var(--color-acento)" stroke={INK} strokeWidth="4" />
          <path d="M84 46 H128 M84 60 H118" {...common} />
          <rect x="84" y="68" width="26" height="10" rx="4" fill={INK} />
        </>
      )}
      {icon === "backend" && (
        <>
          {[12, 40, 68].map((y, i) => (
            <g key={y}>
              <rect x="34" y={y} width="92" height="22" rx="7" fill={i === 1 ? "var(--color-secundario)" : "var(--color-papel)"} stroke={INK} strokeWidth="4" />
              <circle cx="48" cy={y + 11} r="3" fill={INK} />
              <path d={`M92 ${y + 11} H114`} {...common} />
            </g>
          ))}
        </>
      )}
      {icon === "database" && (
        <>
          <path d="M44 22 V74 C44 86 116 86 116 74 V22" fill="var(--color-terciario)" stroke={INK} strokeWidth="4" />
          <path d="M44 48 C44 60 116 60 116 48" {...common} />
          <ellipse cx="80" cy="22" rx="36" ry="12" fill="var(--color-papel)" stroke={INK} strokeWidth="4" />
          <circle cx="118" cy="78" r="13" fill="var(--color-primario)" stroke={INK} strokeWidth="4" />
          <path d="M112 78 L116 82 L124 74" {...common} />
        </>
      )}
      {icon === "integrations" && (
        <>
          <rect x="18" y="30" width="46" height="40" rx="8" fill="var(--color-papel)" stroke={INK} strokeWidth="4" />
          <path d="M34 42 L28 50 L34 58 M48 42 L54 50 L48 58" {...common} />
          <rect x="96" y="30" width="46" height="40" rx="8" fill="var(--color-acento)" stroke={INK} strokeWidth="4" />
          <path d="M106 46 H132 M106 56 H124" {...common} />
          <path d="M68 44 H90 M92 56 H70" {...common} />
          <path d="M84 38 L90 44 L84 50 M76 50 L70 56 L76 62" {...common} />
        </>
      )}
      {icon === "deploy" && (
        <>
          <circle cx="40" cy="22" r="9" fill="var(--color-primario)" stroke={INK} strokeWidth="4" />
          <path d="M50 84 H112 C128 84 136 74 136 62 C136 50 126 42 114 44 C110 30 98 22 84 22 C68 22 56 34 56 48 C44 48 36 56 36 66 C36 76 42 84 50 84 Z" fill="var(--color-papel)" stroke={INK} strokeWidth="4" />
          <rect x="72" y="46" width="24" height="30" rx="6" fill="var(--color-primario)" stroke={INK} strokeWidth="4" />
          <path d="M84 70 V54 M78 60 L84 54 L90 60" {...common} />
        </>
      )}
    </svg>
  );
}
