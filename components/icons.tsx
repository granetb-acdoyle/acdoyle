type IconProps = {
  className?: string;
};

/** Thin single-stroke magnifying glass, abstract only, no figure. */
export function SherlockIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="29"
        y1="29"
        x2="40"
        y2="40"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Thin single-stroke bowler hat with a mustache beneath, abstract only, no face. */
export function WatsonIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 26C10 11 38 11 38 26"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5 27C8 24.5 9 26 10 26H38C39 26 40 24.5 43 27"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 27Q24 29.5 43 27"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13 38C18 38.5 21 37 22.5 36.5L24 35L25.5 36.5C27 37 30 38.5 35 38"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="miter"
        strokeMiterlimit="8"
      />
    </svg>
  );
}

/** Thin single-stroke coin stacks, abstract only, not photographic. */
export function MoriartyIcon({ className }: IconProps) {
  const columns = [
    { x: 11, count: 2 },
    { x: 24, count: 4 },
    { x: 37, count: 3 },
  ];
  const baseY = 37;
  const spacing = 4.5;
  const rx = 6.5;
  const ry = 2.2;

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {columns.map((column) => {
        const topY = baseY - (column.count - 1) * spacing;
        return (
          <g key={column.x}>
            <line
              x1={column.x - rx}
              y1={baseY}
              x2={column.x - rx}
              y2={topY}
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <line
              x1={column.x + rx}
              y1={baseY}
              x2={column.x + rx}
              y2={topY}
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {Array.from({ length: column.count }, (_, i) => (
              <ellipse
                key={i}
                cx={column.x}
                cy={baseY - i * spacing}
                rx={rx}
                ry={ry}
                stroke="currentColor"
                strokeWidth="1.5"
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** Thin single-stroke nested-arc fingerprint, abstract only, for discovery/identification contexts. */
export function FingerprintIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M22 25C22 23 23 22 24 22C25 22 26 23 26 25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18 27C18 21 20 17 24 17C28 17 30 21 30 27"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 30C14 20 18 12 24 12C30 12 34 20 34 30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 32C10 18 16 7 24 7C32 7 38 18 38 32"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Thin single-stroke two-print trail, abstract only, not photographic. */
export function FootprintIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <ellipse
        cx="16"
        cy="33"
        rx="5.5"
        ry="8"
        stroke="currentColor"
        strokeWidth="1.5"
        transform="rotate(-8 16 33)"
      />
      <circle cx="15" cy="22" r="2.8" stroke="currentColor" strokeWidth="1.5" />
      <ellipse
        cx="32"
        cy="21"
        rx="5.5"
        ry="8"
        stroke="currentColor"
        strokeWidth="1.5"
        transform="rotate(8 32 21)"
      />
      <circle cx="33" cy="10" r="2.8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Thin single-stroke ruled ledger sheet, abstract only, for lists/catalogues. */
export function LedgerIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="10"
        y="7"
        width="28"
        height="34"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="15" y1="16" x2="33" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="23" x2="33" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="30" x2="33" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Thin single-stroke padlock, abstract only, for security/custody contexts. */
export function PadlockIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M17 22V16C17 10.5 20 7 24 7C28 7 31 10.5 31 16V22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="11"
        y="22"
        width="26"
        height="19"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="30" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="24" y1="32.2" x2="24" y2="35.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
