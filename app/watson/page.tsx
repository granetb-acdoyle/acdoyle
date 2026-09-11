import Nav from "@/components/Nav";
import { WatsonIcon } from "@/components/icons";

export default function WatsonPage() {
  return (
    <div className="flex flex-1 flex-col bg-ink-gradient">
      <Nav />
      <main className="mx-auto w-full max-w-5xl px-8 py-16 sm:px-16 sm:py-24">
        <WatsonIcon className="h-12 w-12 text-brass" />
        <h1 className="mt-4 font-serif text-4xl leading-tight text-parchment sm:text-5xl">
          Watson
        </h1>

        <div className="mt-16 flex flex-col gap-16">
          <section className="max-w-prose">
            <h2 className="font-serif text-2xl text-parchment">
              What it does
            </h2>
            <p className="mt-4 text-base leading-relaxed text-parchment/90">
              Watson handles non-custodial budget planning. Give it a budget
              and a category, and it decides on concrete allocations, then
              tells the calling agent exactly what to pay and where.
            </p>
          </section>

          <section className="max-w-prose">
            <h2 className="font-serif text-2xl text-parchment">
              How it works
            </h2>
            <p className="mt-4 text-base leading-relaxed text-parchment/90">
              Watson never receives, holds, or forwards funds: its output is
              an instruction, not a transaction. The calling agent&apos;s own
              wallet executes the payment directly with the vendor. acdoyle
              earns a commission, currently a flat rate, only once a real
              payment is confirmed.
            </p>
          </section>
        </div>

        <p className="mt-16 max-w-prose text-xs leading-relaxed text-sage">
          Watson&apos;s allocations are recommendations, not guarantees of
          price or availability. The calling agent is responsible for
          verifying and executing any payment. The commission model is
          currently a flat rate, not yet savings-based.
        </p>
      </main>
    </div>
  );
}
