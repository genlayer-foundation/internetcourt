import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Accent } from "@/components/site/Hero";
import { VideoPlayer } from "@/components/site/VideoPlayer";

export async function TheaterWatch() {
  const t = await getTranslations("home.watch");

  return (
    <section id="watch" className="py-16 md:py-24 bg-[#efe9da]">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t.rich("title", {
            accent: (chunks) => <Accent variant="light">{chunks}</Accent>,
          })}
          subhead={t("subhead")}
        />
        <div className="mt-10 md:mt-12 max-w-4xl mx-auto">
          <VideoPlayer src="https://x1sz5emmhghfuyj2.public.blob.vercel-storage.com/internet-court-launch.mp4" />
        </div>
      </div>
    </section>
  );
}
