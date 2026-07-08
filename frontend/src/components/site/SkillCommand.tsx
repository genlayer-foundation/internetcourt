"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { TELEGRAM_BOT_URL } from "@/lib/site-content";
import { cn } from "@/lib/utils";

const SKILL_CURL = "curl -s https://internetcourt.org/skill.md";
const SKILL_GITHUB =
  "https://github.com/internet-court/internet-court-skill/blob/main/SKILL.md";

export type SkillCommandProps = {
  className?: string;
};

/**
 * Dark "terminal" box for the agent skill, offering two paths into the court.
 * ROW 1 (agent) is a copyable `curl` of the skill.md served from
 * internetcourt.org, captioned "for your agent", with a link to the canonical
 * SKILL.md on GitHub. ROW 2 (human) is the no-agent fallback, anchored by a
 * solid Telegram-blue button to the Clerk Agent. Used in the hero and reused as
 * the closing CTA.
 */
export function SkillCommand({ className }: SkillCommandProps) {
  const t = useTranslations("skillCommand");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SKILL_CURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "w-full max-w-xl mx-auto overflow-hidden rounded-xl bg-[#1c1a16] text-left shadow-lg",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
          {t("label")}
        </span>
        <a
          href={SKILL_GITHUB}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ef6a6a] transition-colors hover:text-white"
        >
          {t("viewOnGithub")}
          <ExternalLink size={11} />
        </a>
      </div>

      {/* ROW 1 — agent install command */}
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5 font-mono text-sm md:text-[15px]">
          <span className="shrink-0 text-[#dc2626]">$</span>
          <code className="min-w-0 break-all text-white/90 md:break-normal">
            {SKILL_CURL}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="ml-auto shrink-0 rounded-md p-1.5 text-white/50 transition-colors hover:text-white"
            title={t("copyTitle")}
            aria-label={t("copyAriaLabel")}
          >
            {copied ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
        <p className="mt-1.5 pl-[1.375rem] font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
          {t("forYourAgent")}
        </p>
      </div>

      {/* Hairline divider */}
      <div className="h-px bg-white/10" />

      {/* ROW 2 — human Telegram path, anchored by the blue button */}
      <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-3.5">
        <p className="min-w-0 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
          {t("noAgent")}
        </p>
        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#229ED9] px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#1b88bb]"
        >
          <Send size={13} />
          {t("talkToBot")}
        </a>
      </div>
    </div>
  );
}
