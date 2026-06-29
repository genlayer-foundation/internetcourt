"use client";

import { useEffect, useRef } from "react";
import { HeroVideoPlayer } from "@/components/site/heroes/HeroVideoPlayer";

const FALLBACK = "#141414";

/**
 * Continuously samples the single TOP-LEFT pixel (0,0) of a playing <video>
 * frame and writes it as an `rgb(...)` string DIRECTLY to the DOM in real time.
 *
 * - Draws the current frame into a 1x1 canvas and reads `getImageData(0,0,1,1)`.
 * - Uses `requestVideoFrameCallback` when available (precise, playback-tied),
 *   else a ~10fps `requestAnimationFrame` loop.
 * - Applies the color via `fillRef.current.style.backgroundColor` inside the
 *   sampling callback — no React state, so there is no re-render/round-trip per
 *   frame and the fill tracks the video without trailing by an extra frame.
 * - `getImageData` is wrapped in try/catch. On a tainted-canvas SecurityError
 *   (no CORS) the loop STOPS and the last color is kept.
 * - Pauses while the document is hidden; resumes on show.
 * - Cleans up rVFC/rAF handles + listeners on unmount.
 *
 * The <video> must carry `crossOrigin="anonymous"` for cross-origin sources to
 * be readable; otherwise the first read taints the canvas and we stop.
 *
 * The sampled color is written each frame to the live-colored FILL layer that
 * forms the left extension, so it tracks the video in lockstep with no
 * per-frame React state.
 */
function useVideoTopLeftPixel(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  fillRef: React.RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    const video = videoRef.current;
    if (typeof window === "undefined" || !video) return;

    // 1x1 canvas — we only need the top-left pixel.
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let stopped = false;
    let rafId = 0;
    let rvfcId = 0;
    let lastTs = 0;
    const fps = 10;
    const minInterval = 1000 / fps;

    const usesRvfc =
      typeof (
        video as HTMLVideoElement & {
          requestVideoFrameCallback?: unknown;
        }
      ).requestVideoFrameCallback === "function";

    const sampleOnce = () => {
      if (video.readyState < 2 || video.videoWidth === 0) return;
      try {
        // Draw the full frame scaled down to 1x1 mapped from the top-left so
        // (0,0) of the canvas corresponds to (0,0) of the video frame.
        ctx.drawImage(video, 0, 0, 1, 1, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        const color = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
        // Drive the FILL layer's background so the visible LEFT EXTENSION
        // (the left-padding strip not covered by the video) reads as the live
        // top-left pixel color. The fill layer sits ABOVE the offset red block
        // (within the container box) and BELOW the video, so the video looks
        // like it extends into the rounded-left corners while the red peeks only
        // at the offset top/right sliver beyond the container box.
        // Write straight to the DOM — no setState, so no per-frame re-render.
        if (fillRef.current) {
          fillRef.current.style.backgroundColor = color;
        }
      } catch {
        // Tainted canvas (no CORS) or transient draw error — keep last color
        // and stop the loop so we don't spin on a hard failure.
        stopped = true;
      }
    };

    const rvfcLoop = () => {
      if (stopped) return;
      sampleOnce();
      if (stopped) return;
      rvfcId = (
        video as HTMLVideoElement & {
          requestVideoFrameCallback: (cb: () => void) => number;
        }
      ).requestVideoFrameCallback(rvfcLoop);
    };

    const rafLoop = (ts: number) => {
      if (stopped) return;
      if (ts - lastTs >= minInterval) {
        lastTs = ts;
        sampleOnce();
        if (stopped) return;
      }
      rafId = window.requestAnimationFrame(rafLoop);
    };

    const start = () => {
      if (stopped) return;
      if (usesRvfc) {
        rvfcId = (
          video as HTMLVideoElement & {
            requestVideoFrameCallback: (cb: () => void) => number;
          }
        ).requestVideoFrameCallback(rvfcLoop);
      } else {
        rafId = window.requestAnimationFrame(rafLoop);
      }
    };

    const stop = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (
        rvfcId &&
        typeof (
          video as HTMLVideoElement & {
            cancelVideoFrameCallback?: (id: number) => void;
          }
        ).cancelVideoFrameCallback === "function"
      ) {
        (
          video as HTMLVideoElement & {
            cancelVideoFrameCallback: (id: number) => void;
          }
        ).cancelVideoFrameCallback(rvfcId);
      }
      rafId = 0;
      rvfcId = 0;
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else if (!stopped) {
        lastTs = 0;
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [videoRef, fillRef]);
}

/**
 * Client island that renders the WHOLE hero video-box: the rounded outer
 * container (whose left-padding strip is the visible "left extension"), the
 * offset brand-red block behind it, and the shared <HeroVideoPlayer/>
 * (flush-right, rounded-r-2xl).
 *
 * Layer order (paint, bottom → top), scoped by `isolate` on the container:
 *   - RED block (`z-0`): offset up-and-right, peeks only at the ~1rem top/right
 *     sliver that lies BEYOND the container box.
 *   - FILL layer (`z-10`, `inset-0`): the live-colored extension. Sits exactly
 *     over the container box, so it covers the red within the box and forms the
 *     visible left-padding strip in the live video color.
 *   - VIDEO (`relative z-20`): flush-right over the fill, rounded-right.
 *
 * A single per-frame sampling callback writes the live top-left (0,0) pixel
 * color of the video DIRECTLY (no React state) to the FILL layer's
 * `backgroundColor`. Because the video covers everything except the
 * left-padding strip, driving the fill layer makes that strip — ending in the
 * container's rounded-left corners — read as the live video color, so the video
 * appears to extend left.
 *
 * The fill layer is initialized to FALLBACK so it is never blank/white before
 * the first sample. The container is intentionally NOT overflow-hidden so the
 * red block peeks.
 */

/**
 * Default desktop geometry of the video box. On desktop its LEFT edge starts at
 * 28rem (`lg:ml-[28rem]`) and it fills to the wrapper's right edge
 * (`lg:w-[calc(100%-28rem)]`). A 6rem left padding (`lg:pl-24`) puts the
 * PICTURE's left edge at 28+6 = 34rem — exactly the fixed text card's right edge
 * — so the video is FLUSH against the card. Callers pass their own `className`
 * to make the picture bigger / align it differently while keeping the same
 * red/fill/video internals and live sampling.
 */
const DEFAULT_PANEL_CLASS =
  "mx-auto w-full max-w-[min(100%,calc((58dvh-2rem)*16/9))] pl-2 sm:pl-4 lg:ml-[28rem] lg:w-[calc(100%-28rem)] lg:max-w-none lg:pl-24";

type HeroVideoPanelProps = {
  /**
   * REPLACES the default desktop geometry/alignment classes of the outer panel
   * container (margin/width/max-width/padding/self-alignment). The constant
   * structural classes (`animate-fade-in-up`, `relative isolate`, `rounded-2xl`,
   * shadow) are always applied.
   */
  className?: string;
};

export function HeroVideoPanel({
  className = DEFAULT_PANEL_CLASS,
}: HeroVideoPanelProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  // Writes the sampled color straight to the fill-layer ref each frame — no
  // React state, so there is no per-frame re-render.
  useVideoTopLeftPixel(videoRef, fillRef);

  return (
    /* Layered horizontal panel. Geometry/alignment classes come from
       `className` (default = flush-left at 34rem). `isolate` scopes the inner
       z-indices (red z-0 → fill z-10 → video z-20) so the layer order is robust
       and the panel stays below the sibling text card. */
    <div
      className={`animate-fade-in-up delay-200 relative isolate rounded-2xl shadow-[0_2px_24px_rgba(26,24,23,0.10),0_0_60px_-20px_rgba(26,24,23,0.18)] ${className}`}
    >
      {/* offset red block, sized to the container (h-full w-full), offset
          up-and-right so it peeks ~1rem at the container's top and right only.
          `z-0` keeps it BEHIND the fill within this isolated container. */}
      <div
        aria-hidden="true"
        className="absolute -right-4 -top-4 z-0 h-full w-full rounded-2xl bg-[#dc2626] shadow-[0_2px_24px_rgba(26,24,23,0.10),0_0_60px_-20px_rgba(26,24,23,0.18)]"
      />
      {/* live-colored FILL/extension, exactly the full container box (inset-0).
          Sits OVER the red, so it covers the red within the box and forms the
          visible left-padding strip in the live video color. Its background is
          written each frame in the sampling callback; initialized to FALLBACK. */}
      <div
        aria-hidden="true"
        ref={fillRef}
        className="absolute inset-0 z-10 rounded-2xl"
        style={{ backgroundColor: FALLBACK }}
      />
      {/* the moving picture, flush-left at the card's right edge, rounded-right
          (its left edge is square/flush against the card), above the fill. */}
      <HeroVideoPlayer
        videoRef={videoRef}
        crossOrigin="anonymous"
        className="relative z-20 aspect-[16/9] w-full rounded-r-2xl"
      />
    </div>
  );
}
