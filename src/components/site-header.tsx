"use client";

import { Separator } from "@/components/ui/separator";

// Paleta
const ROSE = "#e6c2bf";   // rosa
const SAGE = "#8f9892";   // verde salvia
const SAND = "#ede1d8";   // arena
const DARK = "oklch(20% 0 0)"; // fondo oscuro suave (se integra con theme)

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex justify-center">
          {/* Emblema centrado */}
          <div className="flex flex-col items-center gap-4">
            {/* Badge circular estilo “Pregúntale a Gisi” */}
            <div
              className="rounded-full"
              style={{
                // tamaño del badge
                width: 176,
                height: 176,
              }}
            >
              <svg
                viewBox="0 0 200 200"
                width="176"
                height="176"
                className="drop-shadow-sm"
                aria-label="Tropi Coqueta Networking Party Selector"
              >
                {/* Fondo circular oscuro */}
                <circle cx="100" cy="100" r="96" fill={DARK} />

                {/* Anillo arena */}
                <circle cx="100" cy="100" r="96" fill="none" stroke={SAND} strokeWidth="8" />

                {/* Puntos salvia (izq/der) */}
                <circle cx="45" cy="100" r="8.5" fill={SAGE} />
                <circle cx="155" cy="100" r="8.5" fill={SAGE} />

                {/* Texto superior (rosa) */}
                <defs>
                  <path
                    id="topArc"
                    d="M 30 100 A 70 70 0 0 1 170 100"
                    fill="none"
                  />
                  <path
                    id="bottomArc"
                    d="M 170 100 A 70 70 0 0 1 30 100"
                    fill="none"
                  />
                </defs>

                <text
                  fill={ROSE}
                  fontSize="12"
                  fontWeight={700}
                  letterSpacing="1.2"
                >
                  <textPath href="#topArc" startOffset="50%" textAnchor="middle">
                    TROPI COQUETA
                  </textPath>
                </text>

                <text
                  fill={ROSE}
                  fontSize="12"
                  fontWeight={700}
                  letterSpacing="1.2"
                >
                  <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
                    NETWORKING PARTY SELECTOR
                  </textPath>
                </text>

                {/* Monograma central */}
                <text
                  x="50%"
                  y="54%"
                  textAnchor="middle"
                  fill={ROSE}
                  fontSize="72"
                  fontWeight={800}
                >
                  TC
                </text>
              </svg>
            </div>

    
          </div>
        </div>
      </div>


    </header>
  );
}
