"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { STACK_ROWS } from "@/lib/site-content";
import { cn } from "@/lib/utils";

export type AnimatedStackProps = {
  /** Pin the section and scrub the timeline, vs. play it as the section scrolls through. */
  pinned?: boolean;
  /** Rendered above the table, inside the pinned region so it stays with the table. */
  header?: ReactNode;
  /** Rendered below the table; fades in only once the sequence finishes. */
  footer?: ReactNode;
  className?: string;
};

// Per-row start state for the "scattered" look: horizontal offset (px) + width (%).
// The timeline animates FROM these values to the natural aligned state.
const SCATTER = [
  { x: -40, w: "82%" },
  { x: 150, w: "94%" },
  { x: 10, w: "88%" },
  { x: 185, w: "78%" },
  { x: -30, w: "84%" },
  { x: 115, w: "90%" },
];

/**
 * The stack table as a scroll-driven sequence: rows start scattered, settle
 * into an aligned column, the Internet Court pill slides in, then connector
 * lines draw one-by-one from each row to the pill. Two playback modes:
 * `pinned` (section sticks and scrubs the timeline) or scroll-through.
 *
 * The animation only runs on md+ with motion allowed; otherwise the markup's
 * natural (final) state renders statically.
 */
export function AnimatedStack({
  pinned = false,
  header,
  footer,
  className,
}: AnimatedStackProps) {
  const root = useRef<HTMLDivElement>(null);
  // Whether to show the "keep scrolling" hint — only while the section is
  // pinned and the sequence is still playing.
  const [scrollHint, setScrollHint] = useState(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
      () => {
        const rows = gsap.utils.toArray<HTMLElement>(".as-row", el);
        const lines = gsap.utils.toArray<HTMLElement>(".as-line", el);
        const pill = el.querySelector<HTMLElement>(".as-pill");
        const footerEl = el.querySelector<HTMLElement>(".as-footer");

        const scatterFrom = {
          x: (i: number) => SCATTER[i].x,
          width: (i: number) => SCATTER[i].w,
          autoAlpha: 0.25,
        };

        if (pinned) {
          // Play the whole sequence ONCE, the first time the section reaches the
          // middle of the viewport. Not scrubbed and not reversible: it always
          // runs to completion (even on a fast scroll), never plays backwards,
          // and the section is fully static from then on. `once` kills the
          // trigger after the first play so it never re-fires.
          // Strictly sequential beats (each starts after the previous finishes)
          // so the story reads clearly:
          //   arrange rows → Internet Court → lines one by one → caption.
          const tl = gsap.timeline({ paused: true });
          tl.from(rows, {
            ...scatterFrom,
            stagger: 0.1,
            ease: "power3.out",
            duration: 0.8,
          });
          if (pill) {
            tl.from(
              pill,
              { autoAlpha: 0, xPercent: 35, ease: "power2.out", duration: 0.5 },
              ">+0.15",
            );
          }
          tl.from(
            lines,
            {
              scaleX: 0,
              transformOrigin: "left center",
              stagger: 0.18,
              ease: "power1.out",
              duration: 0.4,
            },
            ">+0.15",
          );
          // Caption fades in as the very last beat, so it isn't visible while
          // the section is still assembling.
          if (footerEl) {
            tl.from(
              footerEl,
              { autoAlpha: 0, y: 12, ease: "power2.out", duration: 0.4 },
              ">+0.1",
            );
          }

          // Pin the section centered and drive the sequence with scroll, so it
          // always completes while stuck and in view. The instant it finishes,
          // remove the pin + its spacer and shift the scroll position by the
          // same amount — the view doesn't move, but the section is now a plain
          // static block that never replays or reverses.
          let settled = false;
          const st = ScrollTrigger.create({
            trigger: el,
            start: "center center",
            end: "+=1400",
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            // Show the scroll hint whenever the section is pinned and unfinished.
            onEnter: () => setScrollHint(true),
            onEnterBack: () => setScrollHint(true),
            onLeaveBack: () => setScrollHint(false),
            onUpdate: (self) => {
              if (!settled) tl.progress(self.progress);
            },
            onLeave: () => {
              if (settled) return;
              settled = true;
              setScrollHint(false); // sequence done → drop the hint
              tl.progress(1);
              const spacer = el.parentElement;
              const pinDist =
                spacer && spacer.classList.contains("pin-spacer")
                  ? spacer.offsetHeight - el.offsetHeight
                  : 1400;
              st.kill(true); // remove pin + spacer (leaves the finished tl state)
              window.scrollBy(0, -pinDist); // keep the view exactly where it was
            },
          });

          return () => {
            if (!settled) st.kill();
            tl.kill();
          };
        }

        // Scroll-through: each stage is tied to an explicit viewport milestone,
        // so the timing tracks the section's position regardless of its height.
        //   enters (top bottom) → fully visible (bottom bottom): fragmented hold
        //   fully visible → centered (center center):           arrange + pill
        //   centered → top reaches the top (top top):           lines draw
        const tlAssemble = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "bottom bottom",
            end: "center center",
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
        });
        tlAssemble.from(rows, {
          ...scatterFrom,
          stagger: 0.08,
          ease: "power3.out",
          duration: 1,
        });
        if (pill) {
          tlAssemble.from(
            pill,
            { autoAlpha: 0, xPercent: 35, ease: "power2.out", duration: 0.5 },
            ">",
          );
        }

        const tlLines = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "center center",
            end: "top top",
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
        });
        tlLines.from(lines, {
          scaleX: 0,
          transformOrigin: "left center",
          stagger: 0.16,
          ease: "power1.out",
          duration: 0.5,
        });
        if (footerEl) {
          tlLines.from(
            footerEl,
            { autoAlpha: 0, y: 12, ease: "power2.out", duration: 0.4 },
            ">",
          );
        }

        return () => {
          tlAssemble.scrollTrigger?.kill();
          tlAssemble.kill();
          tlLines.scrollTrigger?.kill();
          tlLines.kill();
        };
      },
    );

    // Trigger positions are measured at mount, before async layout (web fonts,
    // images) settles — which leaves the first paint mapped to the wrong scroll
    // progress until a real scroll forces a recalc. Refresh once things settle.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh);
    const settleTimer = window.setTimeout(refresh, 350);

    return () => {
      window.removeEventListener("load", refresh);
      window.clearTimeout(settleTimer);
      mm.revert();
    };
  }, [pinned]);

  return (
    <>
      <div ref={root} className={cn("as-root", className)}>
        {header ? <div className="mx-auto max-w-6xl px-4">{header}</div> : null}
      <div
        className={cn(
          "relative mx-auto flex max-w-5xl items-stretch gap-12 px-4",
          header && "mt-12 md:mt-16",
        )}
      >
        {/* Rows */}
        <div className="flex flex-1 flex-col gap-3 md:gap-4">
          {STACK_ROWS.map((row) => (
            <div
              key={row.n}
              className="as-row relative flex items-center gap-4 rounded-2xl bg-[#f3f3f2] px-5 py-5 md:gap-6 md:px-8 md:py-6"
            >
              <span className="inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-md border border-[#dc2626]/50 font-mono text-xs text-[#74706c]">
                {row.n}
              </span>
              <span className="flex-1 font-sans font-medium text-base leading-snug md:text-xl">
                {row.layer}
              </span>
              <span className="font-mono text-xs text-muted-foreground md:text-sm text-right">
                {row.standards}
              </span>

              {/* Connector line: starts at the row's right edge, bridges the gap
                  to the Internet Court pill. */}
              <span
                aria-hidden="true"
                className="as-line pointer-events-none absolute left-full top-1/2 hidden h-[2px] w-12 -translate-y-1/2 origin-left rounded-full bg-[#dc2626] md:block"
              />
            </div>
          ))}
        </div>

        {/* Internet Court pill - detached, on the right */}
        <div
          className="as-pill hidden w-14 shrink-0 items-center justify-center rounded-2xl bg-[#dc2626] text-white md:flex"
          aria-hidden="true"
        >
          <span
            className="font-mono text-sm uppercase tracking-[0.5em] whitespace-nowrap"
            style={{ writingMode: "vertical-rl" }}
          >
            Internet Court
          </span>
        </div>
      </div>

      {/* Internet Court banner - mobile (the detached pill + lines are md+ only) */}
      <div className="mx-auto mt-4 max-w-5xl px-4 md:hidden">
        <div className="flex items-center justify-center rounded-2xl bg-[#dc2626] py-3 text-white">
          <span className="pl-[0.4em] font-mono text-xs uppercase tracking-[0.4em] whitespace-nowrap">
            Internet Court
          </span>
        </div>
      </div>

      {footer ? <div className="as-footer">{footer}</div> : null}
      </div>

      {/* "Keep scrolling" hint — red bouncing arrow, shown only while the
          section is pinned and the sequence is still playing (desktop only). */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed bottom-6 right-6 z-50 hidden transition-opacity duration-300 md:block",
          scrollHint ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="flex h-12 w-12 animate-bounce items-center justify-center rounded-full bg-[#dc2626] text-white shadow-lg">
          <ArrowDown size={22} />
        </div>
      </div>
    </>
  );
}
