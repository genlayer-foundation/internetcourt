import { SectionHeading } from "@/components/site/SectionHeading";
import { Accent } from "@/components/site/Hero";
import { VideoPlayer } from "@/components/site/VideoPlayer";

export function TheaterWatch() {
  return (
    <section id="watch" className="py-16 md:py-24 bg-[#f7f7f7]">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeading
          eyebrow="Watch"
          title={
            <>
              See the court <Accent variant="light">in motion</Accent>.
            </>
          }
          subhead="A short look at Internet Court — the open trust layer for agent-to-agent commerce."
        />
        <div className="mt-10 md:mt-12 max-w-4xl mx-auto">
          <VideoPlayer src="/video/internet-court-launch.mp4" />
        </div>
      </div>
    </section>
  );
}
