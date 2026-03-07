import React from "react";

function ipfsToGateway(url: string): string {
  // ipfs://<cid>/<path>
  if (!url.startsWith("ipfs://")) return url;
  const rest = url.slice("ipfs://".length);
  // Common public gateway; can be swapped via env later
  return `https://ipfs.io/ipfs/${rest}`;
}

function extractUrls(text: string): string[] {
  const urls = new Set<string>();
  const re = /(https?:\/\/[^\s)\]]+|ipfs:\/\/[^\s)\]]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const u = m[1].replace(/[\"'.,;:]+$/g, "");
    urls.add(u);
  }
  return Array.from(urls);
}

function isLikelyImageUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.endsWith(".png") ||
    u.endsWith(".jpg") ||
    u.endsWith(".jpeg") ||
    u.endsWith(".webp") ||
    u.endsWith(".gif")
  );
}

export function EvidenceBlock({
  raw,
  tone = "neutral",
  dense = false,
}: {
  raw: string;
  tone?: "neutral" | "blue" | "pink";
  dense?: boolean;
}) {
  if (!raw) return null;

  // Pretty print JSON evidence if the whole payload is JSON.
  let pretty: string | null = null;
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    pretty = null;
  }

  const text = pretty ?? raw;
  const urls = extractUrls(text);
  const imageUrls = urls
    .map(ipfsToGateway)
    .filter((u) => isLikelyImageUrl(u) || u.includes("/ipfs/"));

  const accent =
    tone === "blue"
      ? "border-blue-600"
      : tone === "pink"
        ? "border-pink-600"
        : "border-border";

  return (
    <div className={`rounded-md border bg-card/80 ${dense ? "px-3 py-2" : "px-3.5 py-2.5"} ${accent}`}>
      <div className="mb-1 text-[9px] font-bold uppercase tracking-[1.5px] text-muted-foreground/60">
        Evidence
      </div>

      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/80">
        {text}
      </pre>

      {urls.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-[9px] font-bold uppercase tracking-[1.5px] text-muted-foreground/60">
            Links
          </div>
          <div className="flex flex-col gap-1">
            {urls.map((u) => {
              const href = ipfsToGateway(u);
              return (
                <a
                  key={u}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-muted-foreground/70 hover:text-[#dc2626]"
                >
                  {u}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {imageUrls.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-[1.5px] text-muted-foreground/60">
            Previews
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {imageUrls.slice(0, 4).map((href) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={href}
                  alt="Evidence image"
                  className="h-auto w-full object-contain bg-[#f7f7f7]"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
