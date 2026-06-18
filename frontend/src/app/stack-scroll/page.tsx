import Link from "next/link";
import { AnimatedStack } from "@/components/site/AnimatedStack";

export const metadata = { title: "Stack animation — Scroll-through" };

export default function StackScrollDemo() {
  return (
    <main className="bg-white text-[#1a1817]">
      <div className="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-full border border-border bg-white/90 px-3 py-1.5 font-mono text-xs shadow-sm backdrop-blur">
        <span className="font-semibold text-[#dc2626]">Scroll-through</span>
        <Link href="/stack-pinned" className="text-[#74706c] underline-offset-2 hover:underline">
          → try pinned
        </Link>
      </div>

      <section className="flex h-screen flex-col items-center justify-center gap-3 text-center">
        <h1 className="font-heading text-4xl md:text-6xl">One court, every layer</h1>
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-[#74706c]">
          Scroll down ↓
        </p>
      </section>

      {/* Scroll-through: the timeline advances as the section crosses the viewport. */}
      <section className="py-24">
        <AnimatedStack />
      </section>

      <section className="flex h-screen items-center justify-center text-center">
        <p className="max-w-md text-lg text-[#74706c]">
          No pinning — the animation tracked the section as it moved through the
          viewport.
        </p>
      </section>
    </main>
  );
}
