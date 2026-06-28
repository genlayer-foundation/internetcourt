import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllPosts } from "@/lib/blog";
import { AcademicIndex } from "@/components/blog/layouts/AcademicIndex";
import { buildAlternates, localizedUrl } from "@/lib/i18n-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog.metadata" });

  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    alternates: buildAlternates("/blog", locale),
    openGraph: {
      title,
      description,
      url: localizedUrl("/blog", locale),
      type: "website",
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "blog.index" });
  const posts = getAllPosts(locale);

  return (
    <div className="mx-auto max-w-6xl px-5 py-20 md:px-4 md:py-28">
      <header className="mb-12 flex flex-col gap-4 md:mb-16">
        <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#dc2626]">
          {t("eyebrow")}
        </div>
        <h1 className="font-heading text-4xl leading-[1.1] md:text-6xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {t("description")}
        </p>
      </header>

      <AcademicIndex posts={posts} locale={locale} />
    </div>
  );
}
