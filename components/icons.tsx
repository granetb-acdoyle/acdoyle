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

/** Thin single-stroke compass rose, abstract only, no figure. */
export function WatsonIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M24 14L28 24L24 34L20 24Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="1.4" fill="currentColor" />
    </svg>
  );
}

/** Thin single-stroke node network, abstract only, no figure. */
export function MoriartyIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <line x1="14" y1="14" x2="24" y2="26" stroke="currentColor" strokeWidth="1.5" />
      <line x1="34" y1="16" x2="24" y2="26" stroke="currentColor" strokeWidth="1.5" />
      <line x1="24" y1="26" x2="18" y2="36" stroke="currentColor" strokeWidth="1.5" />
      <line x1="24" y1="26" x2="34" y2="34" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="34" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="24" cy="26" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="36" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="34" cy="34" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
