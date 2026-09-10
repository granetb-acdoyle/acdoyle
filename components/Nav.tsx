"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/demo", label: "Demo" },
  { href: "/tech", label: "Tech" },
  { href: "/payments", label: "Payments" },
  { href: "/internal/dashboard", label: "Dashboard" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-sage/10">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-8 py-5 sm:px-16">
        <Link href="/" className="font-serif text-lg text-parchment">
          acdoyle
        </Link>
        <div className="flex items-center gap-6 text-sm">
          {LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? "border-b border-brass text-brass"
                    : "text-sage transition-colors hover:text-parchment"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
