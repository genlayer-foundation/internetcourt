import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

function unauthorized() {
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Staging"' },
  });
}

export default function middleware(request: NextRequest) {
  // When BASIC_AUTH_PASSWORD is set (staging/preview), gate the whole site
  // behind HTTP Basic Auth before doing anything else. In production the var
  // is unset, so we fall straight through to the normal next-intl handling.
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (password) {
    const user = process.env.BASIC_AUTH_USER || "court";
    const header = request.headers.get("authorization");

    if (!header || !header.startsWith("Basic ")) {
      return unauthorized();
    }

    let decoded = "";
    try {
      decoded = atob(header.slice(6).trim());
    } catch {
      return unauthorized();
    }

    const sep = decoded.indexOf(":");
    const providedUser = sep === -1 ? decoded : decoded.slice(0, sep);
    const providedPass = sep === -1 ? "" : decoded.slice(sep + 1);

    if (providedUser !== user || providedPass !== password) {
      return unauthorized();
    }
  }

  // The privacy policy is a static, English-only route that lives outside the
  // `[locale]` segment. Skip next-intl so it is never localized (no
  // `/es/privacy`, `/ko/privacy`, ...). Basic Auth above still applies.
  const { pathname } = request.nextUrl;
  if (pathname === "/privacy" || pathname.startsWith("/privacy/")) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

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
