import Link from "next/link";

export function Header() {
  return (
    <header className="relative z-50 pt-4 px-4">
      <div className="bg-[#f7f7f7] rounded-[12px] max-w-[1200px] mx-auto h-14 px-3 py-2 flex items-center overflow-hidden">
        <Link href="/" className="flex items-center gap-2 shrink min-w-0">
          <img src="/logos/tic-logo-red.svg" alt="InternetCourt" className="h-[29px] w-[160px] md:w-[220px]" />
        </Link>
      </div>
    </header>
  );
}
