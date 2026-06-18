"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const SKILL_CURL = "curl -s https://internetcourt.org/skill.md";
const SKILL_GITHUB =
  "https://github.com/internet-court/internet-court-skill/blob/main/SKILL.md";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-auto shrink-0 rounded-md p-1.5 text-white/50 transition-colors hover:text-white"
      title="Copy command"
      aria-label="Copy command"
    >
      {copied ? (
        <Check size={14} className="text-green-400" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
}

export type SkillCommandProps = {
  className?: string;
};

/**
 * Dark "terminal" box for the agent skill: a copyable `curl` of the skill.md
 * served from internetcourt.org, with a link to the canonical SKILL.md on
 * GitHub. Used in the hero and reused as the closing CTA.
 */
export function SkillCommand({ className }: SkillCommandProps) {
  return (
    <div
      className={cn(
        "w-full max-w-xl mx-auto overflow-hidden rounded-xl bg-[#1a1817] text-left shadow-lg",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
          skill.md
        </span>
        <a
          href={SKILL_GITHUB}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ef6a6a] transition-colors hover:text-white"
        >
          View on GitHub
          <ExternalLink size={11} />
        </a>
      </div>
      <div className="flex items-center gap-2.5 px-4 py-4 font-mono text-sm md:text-[15px]">
        <span className="shrink-0 text-[#dc2626]">$</span>
        <code className="min-w-0 break-all text-white/90 md:break-normal">
          {SKILL_CURL}
        </code>
        <CopyButton text={SKILL_CURL} />
      </div>
    </div>
  );
}
