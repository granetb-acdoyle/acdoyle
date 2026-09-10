import Link from "next/link";
import Nav from "@/components/Nav";

const PERSONAS = [
  {
    name: "Sherlock",
    description:
      "General problem-solving. One decisive recommendation with its rationale — never a hedged list, never \"it depends.\"",
  },
  {
    name: "Watson",
    description:
      "Non-custodial budget execution. Tells the calling agent exactly what to pay and where — acdoyle never holds or moves the funds itself.",
  },
  {
    name: "Moriarty",
    description:
      "Business and monetization advice, never securities or investment advice.",
  },
];

const STEPS = [
  "Your agent sends one task to a single endpoint.",
  "The router picks exactly one specialist in the same call — no separate classification round-trip.",
  "Pay per call: a prepaid USDC credit, or a straight x402 402-challenge — whichever your agent prefers.",
  "One decisive, schema-locked answer comes back. No follow-up questions, ever.",
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-ink">
      <Nav />
      <main className="mx-auto w-full max-w-5xl px-8 py-16 sm:px-16 sm:py-24">
        {/* Hero */}
        <section className="max-w-prose">
          <h1 className="font-serif text-4xl leading-tight text-parchment sm:text-5xl">
            The gateway agents pay to think decisively.
          </h1>
          <p className="mt-6 text-xl leading-relaxed text-parchment/90">
            Three specialists. One confident answer each. Settled in USDC,
            per call — no subscriptions, no accounts, no hedging.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="border border-brass bg-brass/10 px-5 py-2.5 text-base text-brass transition-colors hover:bg-brass/20"
            >
              Try it
            </Link>
            <Link
              href="/tech"
              className="border border-sage/30 px-5 py-2.5 text-base text-parchment transition-colors hover:border-brass"
            >
              Read the technical brief
            </Link>
          </div>
        </section>

        {/* Three personas */}
        <section className="mt-24">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {PERSONAS.map((persona) => (
              <div key={persona.name} className="border border-sage/20 px-6 py-6">
                <h2 className="font-serif text-xl text-parchment">
                  {persona.name}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-sage">
                  {persona.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-24 max-w-prose">
          <h2 className="font-serif text-2xl text-parchment">How it works</h2>
          <ol className="mt-8 flex flex-col gap-6">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="font-serif text-lg text-brass">
                  {index + 1}
                </span>
                <p className="text-base leading-relaxed text-parchment/90">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Footer strip */}
        <section className="mt-24 grid grid-cols-1 gap-3 border-t border-sage/10 pt-10 sm:grid-cols-2">
          <Link
            href="/tech"
            className="border border-sage/20 px-6 py-5 text-sm leading-relaxed text-sage transition-colors hover:border-brass hover:text-parchment"
          >
            Built for agents, not dashboards — MCP server, machine-readable
            manifest, forced-decisive routing.
          </Link>
          <Link
            href="/payments"
            className="border border-sage/20 px-6 py-5 text-sm leading-relaxed text-sage transition-colors hover:border-brass hover:text-parchment"
          >
            Two ways to pay, both non-custodial.
          </Link>
        </section>
      </main>
    </div>
  );
}
