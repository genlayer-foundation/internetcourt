import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` is the segment matched by the middleware. Validate it
  // against our supported locales and fall back to the default otherwise.
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Messages live in `frontend/messages/<locale>.json`. Phase 2 fills these
  // out with the actual namespaced copy; for now they are placeholders.
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
