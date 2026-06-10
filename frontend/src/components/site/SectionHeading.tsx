import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionHeadingProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  subhead?: ReactNode;
  align?: "center" | "start";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  subhead,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow && (
        <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#dc2626]">
          {eyebrow}
        </div>
      )}
      {title && (
        <h2 className="text-3xl md:text-5xl font-sans font-extrabold tracking-tight leading-[1.2]">
          {title}
        </h2>
      )}
      {subhead && (
        <p
          className={cn(
            "text-lg text-muted-foreground leading-relaxed max-w-2xl",
            align === "center" && "mx-auto",
          )}
        >
          {subhead}
        </p>
      )}
    </div>
  );
}
