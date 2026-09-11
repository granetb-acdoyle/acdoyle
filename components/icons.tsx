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

/** Thin single-stroke mustache glyph, abstract only, no face. */
export function WatsonIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 30C6 22 12 18 16 22C18 24.5 21 25 24 25C27 25 30 24.5 32 22C36 18 42 22 42 30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
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
