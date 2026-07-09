import { RiArrowDownLine } from "@/components/icons/remix";
import { cn } from "@/lib/utils";

/**
 * Bottom-of-hero "there's more below" cue. Reuses the exact visual treatment of
 * the page's existing scroll hint (AnimatedStack): a brand-red circle with a
 * bouncing lucide ArrowDown. Bounce is disabled under prefers-reduced-motion.
 *
 * Centered at the bottom of each hero so it sits just under the founding-logo
 * marquee, signalling the rest of the page below the fold.
 */
export function HeroScrollCue({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none flex justify-center", className)}
    >
      <div className="flex h-10 w-10 animate-bounce items-center justify-center rounded-full bg-[#dc2626] text-white shadow-lg motion-reduce:animate-none">
        <RiArrowDownLine size={20} />
      </div>
    </div>
  );
}
