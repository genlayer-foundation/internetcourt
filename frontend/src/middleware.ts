import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Run the i18n middleware on everything EXCEPT:
  //  - /api routes (and any other route handlers)
  //  - Next.js internals (/_next, /_vercel)
  //  - the marketing site's static public assets (favicon, logos, partners,
  //    videos, og image, skill.md, sitemap/robots) and any file with an
  //    extension (svg/png/jpg/mp4/...).
  matcher: [
    "/((?!api|_next|_vercel|partners|logos|video|favicon|apple-icon|icon|og-image|robots|sitemap|skill\\.md|.*\\.[\\w]+).*)",
  ],
};
