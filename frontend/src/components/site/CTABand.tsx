import Link from "next/link";
import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CTABandAction = {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "tertiary";
  external?: boolean;
};

export type CTABandProps = {
  title: ReactNode;
  actions?: CTABandAction[];
  children?: ReactNode;
  className?: string;
};

function ActionLink({ action }: { action: CTABandAction }) {
  const baseClasses = "inline-flex items-center justify-center gap-2 font-mono text-sm md:text-base transition-colors";

  const variantClasses = {
    primary:
      "h-11 rounded-md px-6 bg-[#dc2626] text-white hover:bg-red-700 shadow-sm",
    secondary:
      "h-11 rounded-md px-6 border bg-white border-border hover:bg-[var(--accent-red-soft)] hover:text-[#dc2626] hover:border-[var(--accent-red-border)]",
    tertiary:
      "text-[#dc2626] underline-offset-4 hover:underline",
  } as const;

  const className = cn(baseClasses, variantClasses[action.variant]);

  const inner = (
    <>
      <span>{action.label}</span>
      {action.variant !== "tertiary" && <ArrowRight size={16} />}
    </>
  );

  if (action.external || /^https?:\/\//.test(action.href) || action.href.startsWith("mailto:")) {
    return (
      <a
        href={action.href}
        target={action.href.startsWith("mailto:") ? undefined : "_blank"}
        rel={action.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
        className={className}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={action.href} className={className}>
      {inner}
    </Link>
  );
}

export function CTABand({ title, actions = [], children, className }: CTABandProps) {
  return (
    <section className={cn("px-4", className)}>
      <div className="bg-[#f7f7f7] rounded-2xl p-8 md:p-12 max-w-6xl mx-auto">
        <h2
          className={cn(
            "text-2xl md:text-4xl font-sans font-extrabold tracking-tight leading-[1.2] text-center",
            (actions.length > 0 || children) && "mb-8",
          )}
        >
          {title}
        </h2>
        {children}
        {actions.length > 0 && (
          <div
            className={cn(
              "grid gap-4 md:gap-6 items-center",
              actions.length === 3
                ? "grid-cols-1 md:grid-cols-3"
                : actions.length === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1",
            )}
          >
            {actions.map((action) => (
              <div key={action.label} className="flex justify-center">
                <ActionLink action={action} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
