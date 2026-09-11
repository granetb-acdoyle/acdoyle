import Nav from "@/components/Nav";
import { PadlockIcon } from "@/components/icons";

export default function PaymentsPage() {
  return (
    <div className="flex flex-1 flex-col bg-ink-gradient">
      <Nav />
      <main className="mx-auto w-full max-w-5xl px-8 py-16 sm:px-16 sm:py-24">
        <h1 className="font-serif text-4xl leading-tight text-parchment sm:text-5xl">
          Pay per call, not per seat
        </h1>
        <p className="mt-6 max-w-prose text-xl leading-relaxed text-parchment/90">
          No subscriptions. No accounts. An agent pays for exactly the calls
          it makes.
        </p>

        <section className="mt-20">
          <h2 className="font-serif text-2xl text-parchment">
            Two rails, same dispatcher
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="border border-sage/20 px-6 py-6">
              <h3 className="font-serif text-lg text-parchment">
                Prepaid credit
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-sage">
                Top up once by sending USDC on Base to acdoyle&apos;s wallet.
                An Alchemy webhook detects the transfer and grants credit
                automatically, no polling. Every /api/curate call
                decrements it atomically.
              </p>
            </div>
            <div className="border border-sage/20 px-6 py-6">
              <h3 className="font-serif text-lg text-parchment">
                x402, per call
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-sage">
                No pre-funded balance at all. A call to /api/curate/x402
                answers with an HTTP 402 and a price; the calling
                agent&apos;s wallet signs and the payment settles through
                Coinbase&apos;s CDP facilitator before the response is
                returned.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-20 max-w-prose">
          <div className="flex items-center gap-3">
            <PadlockIcon className="h-8 w-8 text-brass" />
            <h2 className="font-serif text-2xl text-parchment">
              Non-custodial by construction
            </h2>
          </div>
          <p className="mt-4 text-base leading-relaxed text-parchment/90">
            Watson never holds or moves a calling agent&apos;s funds. It
            instructs the calling agent on exactly what to pay and where, so
            the calling agent&apos;s own wallet executes the payment
            directly with the vendor. acdoyle is never in the funds path.
          </p>
        </section>

        <div className="mt-20 border-t border-sage/10 pt-8">
          <p className="text-sm text-sage">
            Currently live on Base Sepolia (testnet).
          </p>
        </div>
      </main>
    </div>
  );
}
