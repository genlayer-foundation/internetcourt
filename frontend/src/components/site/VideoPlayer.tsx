"use client";

import { useState } from "react";
import { RiPlayFill } from "@/components/icons/remix";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type VideoPlayerProps = {
  src: string;
  poster?: string;
  className?: string;
  caption?: string;
};

export function VideoPlayer({
  src,
  poster = "/og-image.jpg",
  className,
  caption,
}: VideoPlayerProps) {
  const t = useTranslations("videoPlayer");
  const [playing, setPlaying] = useState(false);

  return (
    <figure className={cn("w-full", className)}>
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border shadow-sm">
        {playing ? (
          <video
            className="absolute inset-0 h-full w-full bg-black"
            src={src}
            controls
            playsInline
            preload="metadata"
            autoPlay
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <button
              type="button"
              aria-label={t("playAriaLabel")}
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/20"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dc2626] shadow-lg transition-transform duration-200 group-hover:scale-110 md:h-20 md:w-20">
                <RiPlayFill className="ml-1 h-7 w-7 text-white md:h-8 md:w-8" />
              </span>
            </button>
          </>
        )}
      </div>
      {caption && (
        <figcaption className="mt-3 text-center font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
