/** Thin ornamental hairline rule with a small centered diamond, used sparingly between major sections. */
export default function Divider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="h-px flex-1 bg-sage/20" />
      <div className="h-1.5 w-1.5 rotate-45 border border-brass/60" />
      <div className="h-px flex-1 bg-sage/20" />
    </div>
  );
}
