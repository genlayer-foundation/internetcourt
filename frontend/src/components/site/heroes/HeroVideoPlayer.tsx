"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

const LAUNCH_VIDEO =
  "https://x1sz5emmhghfuyj2.public.blob.vercel-storage.com/internet-court-launch.mp4";

type HeroVideoPlayerProps = {
  /** Classes for the framing box (border, radius, shadow, aspect, sizing). */
  className?: string;
  /** Classes for the inner <video> element. Defaults to object-cover. */
  videoClassName?: string;
  /** Video source. Defaults to the Blob launch video. */
  src?: string;
  /**
   * Optional external ref to the underlying <video>. Lets a parent read frames
   * for live edge-pixel sampling (see useVideoEdgeColor). The component still
   * manages its own internal ref for the mute/hover controls.
   */
  videoRef?: RefObject<HTMLVideoElement | null>;
  /**
   * Sets the <video> crossorigin attribute. Required ("anonymous") if a parent
   * wants to read frames into a canvas from a cross-origin source without
   * tainting it.
   */
  crossOrigin?: "anonymous" | "use-credentials";
};

/**
 * Shared hero video player.
 *
 * - Autoplays muted + looped (so browser autoplay works) and is decorative by
 *   default, but is now interactive.
 * - A single mute/unmute toggle sits in the top-right corner in both states: a
 *   speaker icon on a translucent dark circular backdrop (VolumeX while muted,
 *   Volume2 while unmuted). Clicking it (the required user gesture) toggles mute
 *   — unmuting also (re)starts playback.
 * - On hover / focus-within over the frame, the native browser controls are
 *   revealed; otherwise they're hidden. Keyboard accessible via focus-within and
 *   a real <button> with aria-label.
 */
export function HeroVideoPlayer({
  className,
  videoClassName,
  src = LAUNCH_VIDEO,
  videoRef: externalVideoRef,
  crossOrigin,
}: HeroVideoPlayerProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [hovered, setHovered] = useState(false);

  // Fan the DOM node out to both the internal ref (controls) and the optional
  // external ref (frame sampling).
  const setVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      internalVideoRef.current = node;
      if (externalVideoRef) externalVideoRef.current = node;
    },
    [externalVideoRef],
  );

  const toggleMute = useCallback(() => {
    const video = internalVideoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    if (!next) {
      // unmuting is a user gesture — (re)start playback
      void video.play().catch(() => {});
    }
    setMuted(next);
  }, []);

  const unmute = useCallback(() => {
    const video = internalVideoRef.current;
    if (!video) return;
    video.muted = false;
    // unmuting is a user gesture — (re)start playback
    void video.play().catch(() => {});
    setMuted(false);
  }, []);

  return (
    <div
      className={cn(
        "group relative overflow-hidden bg-black",
        className,
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <video
        ref={setVideoRef}
        autoPlay
        loop
        muted
        playsInline
        controls={hovered}
        crossOrigin={crossOrigin}
        className={cn("h-full w-full object-cover", videoClassName)}
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Click-to-unmute overlay — only while muted, layered above the video
          (z-10) but below the top-right toggle button (z-20). Clicking anywhere
          unmutes. Decorative: the labeled button remains the a11y control. */}
      {muted ? (
        <div
          aria-hidden="true"
          onClick={unmute}
          className="peer absolute inset-0 z-10 cursor-pointer"
        />
      ) : null}

      {/* Single mute/unmute toggle — top-right, present in both states */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute right-4 top-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-black/70 peer-hover:ring-2 peer-hover:ring-[#dc2626] peer-hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
      >
        {muted ? (
          <VolumeX className="h-7 w-7" />
        ) : (
          <Volume2 className="h-7 w-7" />
        )}
      </button>
    </div>
  );
}
