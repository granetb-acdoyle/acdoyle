import Nav from "@/components/Nav";
import { SherlockIcon } from "@/components/icons";

export default function SherlockPage() {
  return (
    <div className="flex flex-1 flex-col bg-ink-gradient">
      <Nav />
      <main className="mx-auto w-full max-w-5xl px-8 py-16 sm:px-16 sm:py-24">
        <SherlockIcon className="h-12 w-12 text-brass" />
        <h1 className="mt-4 font-serif text-4xl leading-tight text-parchment sm:text-5xl">
          Sherlock
        </h1>

        <div className="mt-16 flex flex-col gap-16">
          <section className="max-w-prose">
            <h2 className="font-serif text-2xl text-parchment">
              What it does
            </h2>
            <p className="mt-4 text-base leading-relaxed text-parchment/90">
              Sherlock is general-purpose, decisive research and
              recommendation. Hand it any well-defined problem and it comes
              back with exactly one confident recommendation, not a hedged
              list of options and not a shrug of &ldquo;it depends.&rdquo;
            </p>
          </section>

          <section className="max-w-prose">
            <h2 className="font-serif text-2xl text-parchment">
              How it works
            </h2>
            <p className="mt-4 text-base leading-relaxed text-parchment/90">
              Forced tool-choice locks the model into a fixed response shape:
              a problem summary, one recommendation, its rationale, and
              explicit caveats. Rather than pausing to ask a follow-up
              question, the persona is instructed to assume and proceed on
              anything left unstated in the original task.
            </p>
          </section>
        </div>

        <p className="mt-16 max-w-prose text-xs leading-relaxed text-sage">
          The recommendation reflects the same underlying model any caller
          could access directly. The value here is decisiveness and
          consistent structure, not proprietary intelligence. Not
          professional advice, verify independently for high-stakes
          decisions.
        </p>
      </main>
    </div>
  );
}
